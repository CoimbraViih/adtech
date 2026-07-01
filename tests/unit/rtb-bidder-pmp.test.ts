import { describe, it, expect } from 'vitest';
import { selectBid, buildBidResponse } from '@/lib/rtb/bidder';
import type { RtbCampaign, OpenRtbBidRequest, PmpDeal } from '@/types/database';

function makeCampaign(overrides: Partial<RtbCampaign> = {}): RtbCampaign {
  return {
    id: 'camp-1',
    workspace_id: 'ws-1',
    campaign_id: null,
    name: 'Test',
    status: 'active',
    deal_type: 'open',
    deal_id: null,
    floor_cpm: 0,
    max_cpm: 5,
    daily_budget: 100,
    total_budget: null,
    pacing: 'even',
    frequency_cap: 10,
    frequency_cap_hours: 24,
    creative_id: null,
    audience_id: null,
    targeting: {},
    start_date: '2026-01-01',
    end_date: null,
    impressions: 0,
    wins: 0,
    spend: 0,
    win_rate: null,
    avg_cpm: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const emptyContext = {
  todaySpend: new Map<string, number>(),
  impressionCounts: new Map<string, number>(),
};

function makeRequest(overrides: Partial<OpenRtbBidRequest> = {}): OpenRtbBidRequest {
  return {
    id: 'req-1',
    imp: [{ id: 'imp-1', bidfloor: 1 }],
    at: 1,
    ...overrides,
  };
}

describe('selectBid — PMP deal enforcement', () => {
  it('open auction ignores pmp field entirely', () => {
    const campaign = makeCampaign({ deal_type: 'open', deal_id: null, max_cpm: 5 });
    const request = makeRequest(); // no pmp field
    const result = selectBid([campaign], request, emptyContext, []);
    expect(result).not.toBeNull();
    expect(result?.campaign.id).toBe('camp-1');
  });

  it('private auction: no-bid when campaign deal_id not in imp deals list', () => {
    const campaign = makeCampaign({ deal_type: 'private', deal_id: 'deal-xyz' });
    const request = makeRequest({
      imp: [{
        id: 'imp-1',
        bidfloor: 1,
        pmp: { private_auction: 1, deals: [{ id: 'deal-abc' }] },
      }],
    });
    const result = selectBid([campaign], request, emptyContext, []);
    expect(result).toBeNull();
  });

  it('private auction: wins when campaign deal_id matches imp deals', () => {
    const campaign = makeCampaign({ deal_type: 'private', deal_id: 'deal-abc', max_cpm: 8 });
    const request = makeRequest({
      imp: [{
        id: 'imp-1',
        bidfloor: 1,
        pmp: { private_auction: 1, deals: [{ id: 'deal-abc', bidfloor: 2 }] },
      }],
    });
    const result = selectBid([campaign], request, emptyContext, []);
    expect(result).not.toBeNull();
    expect(result?.dealid).toBe('deal-abc');
  });

  it('private auction: no-bid when campaign has no deal_id', () => {
    const campaign = makeCampaign({ deal_type: 'private', deal_id: null });
    const request = makeRequest({
      imp: [{
        id: 'imp-1',
        bidfloor: 1,
        pmp: { private_auction: 1, deals: [{ id: 'deal-abc' }] },
      }],
    });
    const result = selectBid([campaign], request, emptyContext, []);
    expect(result).toBeNull();
  });

  it('guaranteed: bypasses auction with deal floor_price', () => {
    const campaign = makeCampaign({
      deal_type: 'guaranteed',
      deal_id: 'deal-g1',
      max_cpm: 1, // below floor!
    });
    const deal: PmpDeal = {
      id: 'pmp-1',
      workspace_id: 'ws-1',
      deal_id: 'deal-g1',
      deal_name: 'Guaranteed Deal',
      deal_type: 'guaranteed',
      floor_price: 10,
      publisher_name: null,
      status: 'active',
      wseat: null,
      start_date: null,
      end_date: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    const request = makeRequest();
    const result = selectBid([campaign], request, emptyContext, [deal]);
    expect(result).not.toBeNull();
    expect(result?.cpm).toBe(10);
    expect(result?.dealid).toBe('deal-g1');
  });

  it('guaranteed: no-bid when no matching deal in deals array', () => {
    const campaign = makeCampaign({
      deal_type: 'guaranteed',
      deal_id: 'deal-g1',
    });
    const request = makeRequest();
    const result = selectBid([campaign], request, emptyContext, []); // empty deals
    expect(result).toBeNull();
  });
});

describe('buildBidResponse — dealid propagation', () => {
  it('includes dealid when present', () => {
    const campaign = makeCampaign();
    const bid = { campaign, cpm: 5, dealid: 'deal-abc' };
    const response = buildBidResponse('req-1', 'imp-1', bid);
    expect(response.seatbid?.[0]?.bid[0]?.dealid).toBe('deal-abc');
  });

  it('omits dealid when absent', () => {
    const campaign = makeCampaign();
    const bid = { campaign, cpm: 5 };
    const response = buildBidResponse('req-1', 'imp-1', bid);
    expect(response.seatbid?.[0]?.bid[0]?.dealid).toBeUndefined();
  });
});
