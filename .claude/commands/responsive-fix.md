Escaneia o projeto inteiro e corrige valores não-responsivos.

Instruções:
1. Use grep para encontrar todos os arquivos .tsx e .css em src/
2. Para cada arquivo, identifique:
   - Valores fixos em px para width/height/font-size que deveriam ser clamp() ou vw/vh
   - Layouts flex/grid sem breakpoints md: ou lg: do Tailwind
   - Imagens sem classes md: para object-position responsiva
   - Textos grandes (>24px fixo) sem variantes responsivas
   - Elementos absolutamente posicionados com px fixos que quebram em telas pequenas
3. Liste todos os problemas encontrados agrupados por arquivo com número de linha
4. Pergunte ao usuário quais quer corrigir
5. Para cada aprovado, aplique a correção:
   - px fixos → clamp(min, valor_vw, max) onde min ≈ 60% do original, max = original
   - Layouts → adicionar classes Tailwind md: e lg: sem remover inline styles não-responsivos
   - Tamanhos de fonte → texto responsivo com clamp(tamanho_mobile, vw, tamanho_desktop)
6. Rode npx tsc --noEmit ao final para garantir zero erros TypeScript
