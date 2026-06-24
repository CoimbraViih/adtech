Audita e corrige problemas de performance no projeto.

Instruções:
1. Leia todos os arquivos em src/ com grep e Read
2. Verifique e liste problemas em cada categoria:

   VÍDEOS:
   - autoPlay sem IntersectionObserver para pausar fora do viewport
   - Sem preload="none" em vídeos abaixo do fold
   - Múltiplos vídeos tocando simultaneamente sem controle

   IMAGENS:
   - Imagens acima do fold sem priority na tag Next.js Image
   - Imagens sem sizes adequado ao layout real
   - URLs externas para assets (devem ser locais)

   ANIMAÇÕES:
   - filter: blur() animado via GSAP sem force3D: true
   - CSS clip: rect() (deprecated, deve ser clip-path: inset())
   - Rotação contínua em elementos grandes (força repaint)
   - Animações repeat:-1 sem pausa quando fora do viewport

   GERAL:
   - Imports não utilizados
   - useEffect sem cleanup (ScrollTrigger não killado)
   - Componentes pesados carregados sem dynamic import

3. Para cada problema, mostre: arquivo, linha, problema, correção sugerida
4. Pergunte ao usuário quais corrigir
5. Aplique as correções aprovadas
6. Rode npx tsc --noEmit ao final
