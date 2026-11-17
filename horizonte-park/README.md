# Horizonte Park · Santarém (PA)

Página de apresentação do loteamento **Horizonte Park**, na Av. Eng. Fernando Guilhon, em Santarém (PA). O empreendimento se apresenta como a "primeira cidade inteligente do Oeste do Pará".

Site estático e autocontido, sem etapa de build: basta servir a pasta (por exemplo, `python3 -m http.server`) ou publicá-la no GitHub Pages.

## O que tem

- **Hero** com render aéreo, entrada tipográfica animada e parallax.
- **Manifesto** que se revela palavra por palavra e números com contador (819 mil m², 988 lotes, 242 m², 4 min do aeroporto).
- **Masterplan 3D** (Three.js), fixado na tela e conduzido pela rolagem. São cinco camadas: território, malha viária e ciclofaixas, 988 lotes com casas surgindo, áreas verdes e lago, e o modo noturno com iluminação, Wi-Fi e videomonitoramento. É possível arrastar para girar a cena, e rótulos HTML acompanham a câmera.
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
js/main.js            interações, ScrollTrigger, galeria, lightbox, mapa
js/masterplan3d.js    maquete 3D procedural (módulo ES)
vendor/               three 0.170, gsap 3.12.5, lenis 1.1.18, leaflet 1.9.4
fonts/                Fraunces e Manrope (variáveis, auto-hospedadas)
img/                  imagens otimizadas em WebP
```

## Fontes e direitos

- Renders, fotos de obra, logotipo e marcas: Horizonte Park / Grupo Horizonte (horizontepark.com.br). **O uso público dessas imagens depende de autorização do empreendimento.**
- Fotos de Santarém (Wikimedia Commons): Wellington Gabler, CC BY 2.0; idobi, CC BY-SA 3.0.
- Mapa: Esri World Imagery e World Street Map; coordenadas de referência via Nominatim/OpenStreetMap.
- A maquete 3D é uma interpretação esquemática e não representa a planta aprovada.
