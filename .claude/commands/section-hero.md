Crie uma seção Hero cinematográfica completa para este projeto Next.js.

Argumento (opcional): tema ou identidade visual. Ex: "dark editorial" ou "light minimal"

Instruções:
1. Leia src/app/globals.css para entender os tokens de cor e fontes disponíveis
2. Leia src/sections/Hero.tsx como referência de estrutura e padrões do projeto
3. A seção deve ter:
   - Preloader com logo + texto, animado com GSAP timeline
   - Fundo fullscreen (imagem ou vídeo) com parallax no scroll
   - Headline principal com tipografia responsiva (clamp)
   - HUD superior (logo + nav) e inferior (info + scroll indicator)
   - Entrada cinematográfica: bg desfoca/clareia, elementos sobem com blur
   - Lock de scroll via Lenis durante o loader (use useLenis de lenis/react)
4. Use useRef para cada elemento animado, useGSAP para as timelines
5. Adicione id="inicio" na section
6. Salve em src/sections/Hero.tsx (substituindo) ou em um novo arquivo se solicitado
7. TypeScript sem erros — rode npx tsc --noEmit ao final
