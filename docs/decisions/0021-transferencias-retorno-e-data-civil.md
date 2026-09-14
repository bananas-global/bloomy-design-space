# 0021 — Retorno da transferência e data civil

Data: 2026-09-14 · Situação: proposta

- Mapas movidos nesta sessão recebem a etiqueta Transferido; o encerramento informa o destino.
- O ranking expõe os destinos elegíveis na ordem já usada pela sugestão, sem alterar a reserva de horários ou a prioridade da seleção.
- A sugestão contextual depende de um destino escolhido. A exceção de especialidade reúne explicação, interruptor e justificativa no mesmo bloco.
- Datas de vigência no formato YYYY-MM-DD são datas civis: sua apresentação numérica preserva o dia, independentemente do fuso do processo. Instantes com horário continuam usando America/Sao_Paulo.

A correção de data resolve a falha do CI em UTC, que exibia o dia anterior. Testes exercitam UTC, America/Sao_Paulo e Asia/Tokyo. As jornadas de transferência verificam o comportamento da interface.
