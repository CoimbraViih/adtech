Crie um componente React com GSAP + ScrollTrigger pronto para usar neste projeto.

Argumento (opcional): nome do componente e tipo de animação desejada. Ex: "HeroText fade-up" ou "ImageReveal clip-path"

Instruções:
1. Leia o AGENTS.md para entender a versão do Next.js
2. Use "use client" no topo
3. Importe useRef e useGSAP de @gsap/react, gsap e ScrollTrigger
4. Registre ScrollTrigger com gsap.registerPlugin(ScrollTrigger)
5. Aplique gsap.set() no estado inicial (opacity 0, y, filter blur etc)
6. Use ScrollTrigger com scrub ou toggleActions conforme o tipo de animação
7. Faça cleanup correto: retorne função que mata os ScrollTriggers
8. Use clamp() para tamanhos responsivos
9. Não use comentários óbvios — só onde o "porquê" não é evidente
10. Salve o arquivo em src/components/ui/[NomeComponente].tsx
11. Mostre um exemplo de uso do componente ao final
