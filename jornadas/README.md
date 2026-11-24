# Quadro de Jornadas

Plataforma para montar a escala de trabalho de uma empresa e calcular a distribuição de jornadas. Já incorpora o fim da escala 6x1 (EC 141/2026) e mostra ao empresário as alternativas de adequação mais baratas. Também apura horas e custos e verifica a conformidade trabalhista. É um arquivo HTML único que roda no navegador, sem servidor; os dados ficam no computador de quem usa.

**[Abrir a plataforma](https://yarceygomes.github.io/compressor-pdf-pje/jornadas/)**

## Regras de jornada aplicadas (compiladas em 24/11/2026)

| Período | Limite semanal | Repousos | Divisor |
|---|---|---|---|
| até 15/12/2026 | 44h | 1 por semana | 220 |
| 16/12/2026 a 15/12/2027 | 42h | 2 por semana | 210 |
| a partir de 16/12/2027 | 40h | 2 por semana | 200 |

- **Fontes:** EC 141/2026 (art. 7º, XIII e XV, da Constituição), Decreto 13.173/2026 e Portaria MTE 2.041/2026.
- **Transição:** sem norma coletiva, as 42h podem ser distribuídas em cinco dias de até 8h24, sem pagar extra pelos 24 minutos. Essa regra vem de uma decisão provisória do STF (ADIs 8.041 e 8.042), que ainda será julgada pelo plenário.
- **Domingos:** no comércio, ao menos um domingo de folga a cada 3 semanas; nas demais atividades, a cada 4.
- **Corte:** a semana que contém a data de mudança já segue a regra nova (critério conservador).

Confira o texto oficial no Diário Oficial e a norma coletiva da categoria antes de decidir.

## Como usar com os dados da sua empresa

1. Clique em **Começar com minha empresa**.
2. Em **Empresa**, informe o horário de funcionamento, o número mínimo de pessoas por dia, os horários de pico e os feriados locais.
3. Em **Equipe**, cadastre as pessoas de uma das duas formas:
   - pelo formulário rápido;
   - por **Colar lista**, com uma linha por pessoa copiada de uma planilha: `Nome; Cargo; Regime; Carga semanal; Salário; Turno; Entrada`.
4. Clique em **Gerar escala**. Qualquer dia pode ser ajustado clicando na célula.
5. Em **Cenários e economia**, compare as alternativas e aplique a recomendada com um clique.
6. Use **Gerar PDF** para baixar o relatório: resumo, escala semana a semana, quadro de horário (art. 74 da CLT), apuração, conformidade e cenários.

## Módulos

- **Escala:**
  - regimes 5x2 (8h48 até 15/12/2026, 8h24 na transição e 8h depois), 4x3 (10h com compensação), 12x36 e 6x1 (válida só até 15/12/2026);
  - mapa de cobertura da demanda e detalhe de cada dia.
- **Cenários e economia:** simula, sob as regras de 42h ou de 40h, as seguintes alternativas:
  - manter a equipe como está;
  - trocar 6x1 por 5x2;
  - trocar 6x1 por 4x3;
  - contratar em tempo parcial;
  - cobrir as horas que faltam com hora extra;
  - 12x36 com intervalo usufruído (quando o intervalo é indenizado).

  Recomenda a de menor custo efetivo sem infrações, ou seja, o custo da folha somado ao valor das horas descobertas pagas como extra. Traz ainda uma lista de medidas de economia, cada uma com valor estimado, risco e base legal, e um checklist de adequação.
- **Apuração:**
  - hora noturna reduzida e prorrogação noturna (Súmula 60, II);
  - horas extras sobre o limite de cada etapa, com o adicional noturno na base da extra noturna (OJ 97);
  - feriados em dobro (Súmula 146), interjornada suprimida (OJ 355) e intervalos indenizados;
  - reflexos em DSR, provisões de 13º e férias, FGTS e encargos.
- **Conformidade:** verifica:
  - dois repousos por semana e a 6x1 após 16/12/2026;
  - limites diário e semanal e o máximo de 2h extras por dia;
  - intervalos, 11h entre jornadas, 35h em torno da folga e repouso até o 7º dia;
  - domingos, tempo parcial e média semanal do 12x36.
- **Distribuição semanal:** calculadora da jornada do contrato em cada etapa da emenda.
- **Fundamentos:** quadro com as regras aplicadas.

## Testes

```
npm i -D playwright && npx playwright install chromium   # se ainda não estiver instalado
node --test jornadas/tests/*.test.cjs
```

São 23 testes (node:test + Playwright), que cobrem:

- **Cálculo:** hora noturna, feriados móveis, etapas da EC 141 e semana de corte, jornada e divisor de cada regime em cada etapa, distribuição semanal e leitura de listas.
- **Regras na escala gerada:** dois repousos por semana, repouso até o 7º dia, 11h entre jornadas, intervalos, domingos e alternância do 12x36.
- **Casos calculados à mão:** horas extras geradas pela hora noturna reduzida, provisões e encargos, feriado em dobro, interjornada, 7º dia e média do 12x36 frente às 40h.
- **Cenários:** a recomendação sai de fato do menor custo, e aplicá-la elimina a 6x1.
- **PDF e uso no navegador:** geração do PDF, migração de dados salvos na versão anterior e uso completo no computador e no celular.

## Créditos

[jsPDF](https://github.com/parallax/jsPDF) 2.5.1 e [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) 3.8.2, licença MIT, em `vendor/`.

Ferramenta de planejamento: não substitui a análise da norma coletiva aplicável nem dos registros de ponto.
