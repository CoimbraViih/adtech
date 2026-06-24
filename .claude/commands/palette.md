Gera variações de paleta de cor para o projeto mantendo a identidade visual.

Argumento (opcional): direção da variação. Ex: "mais quente", "monocromático", "high contrast", "pastel"

Instruções:
1. Leia src/app/globals.css e identifique:
   - Cores primárias (@theme e variáveis CSS)
   - Cores de acento usadas inline nos componentes (grep por "#" nos .tsx)
   - Backgrounds das seções (bg da Hero, Artistas, MelhoresBH, Galeria, Manifesto, etc)
2. Monte um mapa visual da paleta atual no terminal (nome → hex)
3. Gere 3 variações baseadas no argumento ou nas cores existentes:
   - Variação A: mantém o tom escuro, muda a cor de acento
   - Variação B: inverte o esquema claro/escuro das seções
   - Variação C: mantém estrutura, ajusta saturação/temperatura
4. Para cada variação, mostre as cores propostas antes de aplicar
5. Pergunte qual variação (ou mistura) o usuário quer aplicar
6. Aplique a variação escolhida:
   - Atualize os tokens em globals.css (@theme)
   - Atualize as cores hardcoded nos components afetados
7. Liste todos os arquivos modificados ao final
