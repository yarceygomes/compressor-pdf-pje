# Compressor de PDF para o PJe

Reduz PDFs para caberem nos limites de tamanho do PJe antes do protocolo, **direto no navegador**. O arquivo não sai do seu computador: toda a compressão roda localmente.

**[▶ Usar agora](https://yarceygomes.github.io/compressor-pdf-pje/)**

## Como funciona

A página é um arquivo HTML único, com o **Ghostscript** compilado para WebAssembly embutido. Você escolhe o PDF, ajusta a qualidade e baixa a versão comprimida, sem instalar nada e sem enviar o processo para servidor algum. Também funciona offline: basta baixar o `index.html` e abrir no navegador.

## Outros projetos neste repositório

- **[Quadro de Jornadas](https://yarceygomes.github.io/compressor-pdf-pje/jornadas/)** — distribuição de jornadas, escalas de revezamento, apuração de horas e conformidade com a CLT (`jornadas/`).

## Créditos e licença

- [Ghostscript](https://www.ghostscript.com/) 10.06, © Artifex Software, licença AGPL-3.0.
- [pdf-lib](https://github.com/Hopding/pdf-lib), licença MIT.

Por incluir o Ghostscript, este projeto é distribuído sob a **GNU AGPL-3.0** (arquivo `LICENSE`).

---

Autor: **Yarcey Gomes**, advogado (OAB/PA 40.438) · [Portfólio](https://yarceygomes.github.io)
