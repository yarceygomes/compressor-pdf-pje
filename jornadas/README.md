# Quadro de Jornadas

Plataforma de cálculo da distribuição de jornadas de trabalho: monta a escala de revezamento de uma empresa a partir da demanda de cobertura, apura horas e custos e verifica a conformidade com a CLT. Arquivo HTML único, sem servidor: os dados ficam no navegador.

## Como usar com os dados da sua empresa

1. Na faixa de aviso, clique em **Começar com minha empresa** (ou em *Empresa e demanda › Começar do zero*).
2. **Empresa e demanda:** razão social, atividade, início do ciclo, horário de funcionamento, efetivo mínimo por dia, picos de movimento e feriados locais.
3. **Equipe:** cadastre cada colaborador no formulário (Enter adiciona e mantém cargo, regime, carga e salário para o próximo) ou use **Colar lista**, com uma linha por pessoa copiada de uma planilha: `Nome; Cargo; Regime; Carga semanal; Salário; Turno; Entrada`.
4. **Gerar escala:** a jornada é montada na hora; ajuste qualquer dia clicando na célula. Apuração e conformidade se atualizam automaticamente.

Os dados ficam salvos no navegador. *Copiar configuração* e *Importar* levam o cadastro para outro computador.

## Módulos

- **Escala** — escala cíclica (2 a 6 semanas) para regimes 6x1, 5x2 e 12x36. Folgas nos dias de maior sobra de pessoal, DSR até o 7º dia, rodízio dominical, folga adicional por feriado; entrada e intervalo escolhidos para cobrir os horários de maior déficit. Mapa de cobertura, detalhe por dia e ajuste manual de células.
- **Apuração** — hora noturna reduzida (fator 8/7), prorrogação noturna (Súmula 60, II), horas extras sobre o módulo semanal, HE noturna com adicional na base (OJ 97), feriados em dobro (Súmula 146), interjornada suprimida (OJ 355), intervalos indenizados (art. 71, § 4º), reflexos em DSR, FGTS e encargos.
- **Conformidade** — limites diário e semanal, 2h extras, intervalos (art. 71), interjornada (art. 66), 35h em torno da folga (Súmula 110), 7º dia (OJ 410), domingo no comércio (Lei 10.101/2000) e art. 386, tempo parcial (art. 58-A), 12x36 (art. 59-A).
- **Distribuição semanal** — repartição da carga contratual entre os dias (uniforme, sábado reduzido ou personalizada), horários de saída, divisor e valor da hora.
- **Fundamentos** — quadro normativo aplicado.

## Testes

```
npm i -D playwright && npx playwright install chromium   # se ainda não estiver instalado
node --test jornadas/tests/*.test.cjs
```

A suíte (`jornadas/tests/quadro.test.cjs`) cobre as funções de cálculo (hora noturna, Páscoa e feriados, jornadas por regime, distribuição semanal, leitura de listas), as invariantes legais da escala gerada (DSR até o 7º dia, interjornada, intervalos, rodízio dominical, alternância do 12x36), casos de apuração calculados à mão (HE gerada pela hora ficta, OJ 97, dobra de feriado, interjornada suprimida, 7º dia) e o fluxo completo no navegador, em desktop e celular.

Ferramenta de planejamento: não substitui a análise da norma coletiva aplicável nem dos registros de ponto.
