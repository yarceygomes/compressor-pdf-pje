# Horizonte Park · Santarém (PA)

Página de apresentação do loteamento **Horizonte Park**, na Av. Eng. Fernando Guilhon, em Santarém (PA). O empreendimento se apresenta como a "primeira cidade inteligente do Oeste do Pará".

Site estático e autocontido: abre com dois cliques no `index.html` (inclusive offline, exceto mapa e vídeo) ou publicado no GitHub Pages.

## O que tem

- **Hero** com render aéreo, entrada tipográfica animada e parallax.
- **Manifesto** que se revela palavra por palavra e números com contador (819 mil m², 988 lotes, 242 m², 4 min do aeroporto).
- **Masterplan 3D** (Three.js), fixado na tela e conduzido pela rolagem. São cinco camadas: território, malha viária e ciclofaixas, 988 lotes com casas surgindo, áreas verdes e lago, e o modo noturno com iluminação, Wi-Fi e videomonitoramento. É possível arrastar para girar a cena, e rótulos HTML acompanham a câmera.
- **Explorar o bairro**: no 3D, 8 zonas clicáveis. A câmera voa até a zona escolhida e abre um painel com ficha técnica e itens numerados. "Ver imagens" leva a um visualizador imersivo com abas para cada ambiente.
- **Raio de vida**: um gráfico radial mostra o tempo de carro e a direção de 20 pontos da cidade.
- **Mapa com filtros por categoria** (praias, compras, educação, saúde, lazer e mobilidade). Cada ponto mostra a rota real desenhada até o Horizonte Park (OSRM).
- **Um dia no Horizonte Park**: cartões com a rotina possível, do nascer do sol no lago ao fim de semana em Alter do Chão.
- **Agende uma visita**: formulário que abre o WhatsApp com a mensagem pronta.
- **Trilha sonora ambiente** original, sintetizada em tempo real (Web Audio), ligada por um botão.
- **Pilares**, **infraestrutura** em grade bento e seção de **tecnologia**, com o celular em 3D (tilt).
- **Galeria horizontal** fixada na rolagem, com lightbox acessível por teclado.
- **Linha do tempo da obra**, com o comparativo projeto × realidade e fotos de campo e de drone.
- **Mapa** (Leaflet) com satélite da Esri, área equivalente aos 819 mil m², pontos de referência e lista clicável que leva a câmera até cada ponto.
- **Notícias de contexto**, **Grupo Horizonte**, CTA com WhatsApp e rodapé com fontes e créditos.
- Rolagem suave (Lenis) e GSAP ScrollTrigger. O site respeita `prefers-reduced-motion`, funciona no celular e cai para uma imagem estática se não houver WebGL.

## Estrutura

```
index.html
css/style.css
js/main.js            interações, ScrollTrigger, galeria, lightbox, mapa, radar, visita
js/explore.js         modo explorar (zonas, painel, visualizador imersivo)
js/pois.js            pontos de interesse, tempos e rotas (OSRM)
js/ambient.js         trilha sonora sintetizada (Web Audio API)
js/masterplan3d.js    maquete 3D (bundle gerado, inclui three 0.170)
src/masterplan3d.js   fonte da maquete 3D
vendor/               gsap 3.12.5, lenis 1.1.18, leaflet 1.9.4
fonts/                Fraunces e Manrope (variáveis, auto-hospedadas)
img/                  imagens otimizadas em WebP
```

## Fontes e direitos

- Renders, fotos de obra, logotipo e marcas: Horizonte Park / Grupo Horizonte (horizontepark.com.br). **O uso público dessas imagens depende de autorização do empreendimento.**
- Fotos de Santarém (Wikimedia Commons): Wellington Gabler, CC BY 2.0; idobi, CC BY-SA 3.0.
- Mapa: Esri World Imagery e World Street Map; coordenadas de referência via Nominatim/OpenStreetMap.
- A maquete 3D é uma interpretação esquemática e não representa a planta aprovada.

## Editar a maquete 3D

O arquivo-fonte é `src/masterplan3d.js`. Depois de editar, gere o bundle (que funciona também via `file://`):

```
npm i three@0.170.0 esbuild
npx esbuild src/masterplan3d.js --bundle --format=iife --minify --target=es2019 --outfile=js/masterplan3d.js
```
