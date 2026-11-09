# Gerência de Projetos: Sistema de Gerenciamento de Entregas e Acompanhamento de Pedidos

**Universidade do Vale do Rio dos Sinos — UNISINOS** · Processo de Software · Prof. Dr. Roberto Zanoni
**Equipe:** Arthur C., Matheus, Richard, Lorenzo B. e Lorenzo P. · São Leopoldo, novembro de 2026

---

## 1. Introdução

O trabalho propõe a gerência de um projeto de software para uma empresa de médio porte do varejo online que precisa de um sistema digital de gerenciamento de entregas e acompanhamento de pedidos. O sistema atende três perfis: o **cliente**, que acompanha o status da compra em tempo real; o **entregador**, que recebe rotas otimizadas e atualizações automáticas; e o **administrador**, que consulta relatórios de desempenho logístico (entregas no prazo, atrasos e cancelamentos).

O sistema também envia notificações por aplicativo e e-mail e protege dados pessoais e financeiros, o que o coloca sob a Lei Geral de Proteção de Dados (LGPD). Esses requisitos combinam várias incertezas: integração com mapas e transportadoras, tempo real, múltiplos perfis de acesso e segurança da informação.

Por isso adotou-se o modelo de processo **Espiral**, que organiza o projeto em voltas sucessivas. Em cada volta definem-se objetivos, analisam-se riscos, desenvolve-se e testa-se um protótipo ou incremento e submete-se o resultado à avaliação do cliente. O modelo dá ao gerente uma forma sistemática de controlar escopo, prazo, custo e qualidade.

O desenvolvimento segue três atividades: (1) planejamento e organização do projeto, com base nas atividades metodológicas do processo genérico de Pressman; (2) escolha e justificativa do modelo de processo; (3) análise de riscos e segurança, com plano de mitigação.

## 2. Planejamento e organização do projeto

O projeto é administrado em cinco etapas, alinhadas às atividades metodológicas de Pressman (comunicação, planejamento, modelagem, construção e emprego), apoiadas por atividades de suporte durante todo o ciclo de vida. Cada etapa se repete a cada volta da espiral, com profundidade crescente.

### 2.1 Perfis de usuários e forma de interação

| Perfil | O que precisa do sistema | Como participa do projeto |
| --- | --- | --- |
| Cliente (comprador) | Ver o status do pedido em tempo real, receber avisos por app e e-mail, ter dados protegidos | Entrevistas e testes de usabilidade do protótipo, com grupo de clientes reais |
| Entregador | Receber rota otimizada, atualizar o status com poucos toques, trabalhar mesmo com sinal fraco | Acompanhamento em campo, testes do app em rota real e treinamento antes da implantação |
| Administrador (gestores e logística) | Painel e relatórios de entregas no prazo, atrasos e cancelamentos; gestão de usuários e permissões | Reuniões de planejamento e de revisão ao fim de cada volta; aprovação dos indicadores |

Os usuários do sistema são apenas esses três perfis. A diretoria e a equipe de TI da empresa participam como partes interessadas (stakeholders), nas decisões de escopo, orçamento e integração, mas não são perfis de acesso nem geram funcionalidade no aplicativo.

### 2.2 Etapas do projeto (atividades metodológicas de Pressman)

| Etapa | O que será feito | Perfis envolvidos |
| --- | --- | --- |
| Comunicação | Reunião inicial com gestores e logística; levantamento de requisitos; separação entre necessidades (requisitos explícitos) e expectativas (requisitos ainda não identificados); definição de escopo e critérios de sucesso | Todos |
| Planejamento | Estimativas de prazo, custo e esforço; cronograma por volta; definição da equipe; plano de riscos; plano de comunicação | Administrador e gestores |
| Modelagem | Casos de uso e histórias de usuário, arquitetura, modelo de dados, protótipos de telas e desenho da integração com mapas, pagamentos e transportadoras | Cliente, entregador e administrador (validação dos protótipos) |
| Construção | Codificação do app do cliente, do app do entregador, do painel administrativo e da API; testes unitários, de integração, de carga e de segurança | Equipe de desenvolvimento e testers |
| Emprego | Implantação em ambiente real, treinamento dos entregadores e da equipe interna, coleta de feedback e suporte | Todos |

### 2.3 Atividades de engenharia de software

| Atividade | Descrição no projeto | Resultado esperado |
| --- | --- | --- |
| Engenharia de requisitos | Levantamento, análise e validação dos requisitos funcionais (rastreamento, rotas, notificações, relatórios) e não funcionais (segurança, desempenho, disponibilidade, LGPD) | Documento de requisitos e backlog priorizado |
| Projeto (design) | Arquitetura em camadas com API central, apps móveis, painel web e serviço de notificações; modelo de dados; perfis de acesso | Documento de arquitetura e protótipos aprovados |
| Codificação | Desenvolvimento por módulos, com revisão de código e controle de versão | Incrementos funcionando a cada volta |
| Verificação e testes | Testes unitários, de integração, de carga, de segurança e de aceitação com usuários | Relatório de testes e defeitos corrigidos |
| Implantação | Publicação dos apps, migração de dados, treinamento e acompanhamento inicial | Sistema em produção |
| Manutenção e evolução | Correções, ajustes de rotas e relatórios, novas integrações | Sistema estável e evoluindo conforme o negócio |

### 2.4 Atividades de apoio

Por todo o projeto, o gerente conduz: acompanhamento e controle do projeto, administração de riscos, garantia da qualidade, revisões técnicas, gerenciamento de configuração (versionamento do código e das versões dos apps) e medição (prazo, custo, defeitos e satisfação do cliente).

### 2.5 Equipe e custo por função

Equipe de nove profissionais. Os salários são a mediana (50º percentil) de mercado do Guia Salarial da Robert Half Brasil (2026/2027) para nível pleno; o custo mensal inclui encargos CLT.

| Função | Qtde | Salário mensal (R$) | Custo mensal com encargos (R$) | Pessoas-mês | Custo total (R$) |
| --- | --- | --- | --- | --- | --- |
| Gerente de projetos (meio período) | 1 | 19.150 | 31.789 | 2,3 | 73.360 |
| Analista de sistemas | 1 | 11.300 | 18.758 | 2,5 | 46.535 |
| Designer UX/UI | 1 | 8.750 | 14.525 | 2,3 | 32.682 |
| Desenvolvedor back-end | 2 | 12.550 | 20.833 | 7,5 | 156.247 |
| Desenvolvedor mobile (multiplataforma) | 1 | 11.700 | 19.422 | 3,3 | 63.869 |
| Desenvolvedor front-end | 1 | 12.650 | 20.999 | 2,6 | 54.517 |
| DevOps (infraestrutura, implantação e banco de dados) | 1 | 19.250 | 31.955 | 2,7 | 86.649 |
| Tester | 1 | 10.450 | 17.347 | 3,2 | 56.044 |
| **Subtotal** | **9** | | | **26,4** | **569.903** |

### 2.6 Cronograma e custo estimados

O cronograma tem **20 semanas**, divididas em cinco voltas da espiral. O custo de cada volta é o custo mensal com encargos de cada função multiplicado pelo tempo dedicado, mais **10% de contingência** para mudanças de requisitos e riscos.

Dedicação de cada profissional (% do tempo integral) por volta:

| Função | V1 | V2 | V3 | V4 | V5 |
| --- | --- | --- | --- | --- | --- |
| Gerente de projetos (meio período) | 50% | 50% | 50% | 50% | 50% |
| Analista de sistemas | 100% | 50% | 50% | 50% | 25% |
| Designer UX/UI | 100% | 50% | 50% | 25% | 25% |
| Desenvolvedor back-end | 25% | 100% | 100% | 100% | 50% |
| Desenvolvedor mobile (multiplataforma) | 25% | 100% | 100% | 50% | 50% |
| Desenvolvedor front-end | 25% | 50% | 50% | 100% | 50% |
| DevOps | 25% | 50% | 50% | 75% | 100% |
| Tester | 25% | 50% | 75% | 100% | 100% |

Custo e duração por volta:

| Volta | Foco | Semanas | Custo da equipe (R$) | Com contingência de 10% (R$) |
| --- | --- | --- | --- | --- |
| 1 | Requisitos, viabilidade e protótipo de telas | 3 | 56.786 | 62.465 |
| 2 | Rastreamento de pedidos e notificações | 5 | 148.587 | 163.446 |
| 3 | Rotas otimizadas e app do entregador | 5 | 153.591 | 168.949 |
| 4 | Relatórios e endurecimento de segurança | 4 | 131.627 | 144.790 |
| 5 | Implantação, treinamento e suporte | 3 | 79.312 | 87.243 |
| **Total** | | **20** | **569.903** | **626.893** |

**Premissas e fontes**

- **Salários:** mediana nacional do Guia Salarial da Robert Half Brasil (2026/2027): back-end pleno R$ 12.550, mobile pleno R$ 11.700, front-end pleno R$ 12.650, analista de testes pleno R$ 10.450, analista de sistemas pleno R$ 11.300, DevOps R$ 19.250 e gerente de projetos/PMO R$ 19.150.
- **Designer UX/UI:** ponto médio da faixa de R$ 6.500 a R$ 11.000 para pleno (JobRise, 2026), ou seja, R$ 8.750 (a Robert Half não publica essa função nas páginas consultadas).
- **Encargos:** acréscimo de 66% sobre o salário (INSS patronal, RAT, terceiros, FGTS de 8% e provisões de 13º e férias com 1/3), conforme a calculadora da Contajá (2026). Benefícios (VR, VT, plano de saúde) não estão incluídos.
- **Dimensionamento:** apps do cliente e do entregador com tecnologia multiplataforma (por exemplo, Flutter ou React Native), permitindo um único desenvolvedor mobile; gerente em meio período; tester em todas as voltas com apoio de testes automatizados.
- **Cálculo:** um mês equivale a 4,33 semanas; custo = salário × 1,66 × dedicação × quantidade × duração em meses.
- **Prazo e dedicação:** estimativas do grupo, a refinar na volta 1 com os gestores. Não foram encontradas referências de mercado para a duração de um projeto com este escopo.
- **Fora da estimativa:** infraestrutura em nuvem, licenças, serviço de mapas e gateway de pagamento, a orçar na volta 1.

### 2.7 Monitoramento e controle

O gerente acompanha o andamento com reuniões curtas semanais e uma revisão ao fim de cada volta com gestores e logística. Indicadores: percentual do escopo entregue, desvio de prazo e de custo, defeitos abertos e estado dos riscos. Havendo desvio, o gerente replaneja a volta seguinte, realoca recursos ou renegocia o escopo, sempre registrando a decisão.

## 3. Escolha do modelo de processo: Espiral

Escolheu-se o modelo Espiral, com prototipação em cada volta: dá clareza na comunicação com a empresa, entrega funcionando por partes e absorve mudanças de requisitos, porque trata os riscos como parte do processo.

### 3.1 Reunião inicial com gestores e logística

Participam o gerente de projetos, o analista de requisitos, um gestor de logística, um representante de TI e um responsável por proteção de dados (ou jurídico). Pauta (primeira atividade da volta 1):

1. Apresentar o problema e os objetivos: reduzir atrasos, dar visibilidade ao cliente e consolidar indicadores logísticos.
2. Levantar necessidades e restrições: sistemas existentes (ERP, e-commerce, transportadoras), orçamento, prazos e exigências de segurança.
3. Separar necessidade (requisito explícito) de expectativa (requisito ainda não identificado), com perguntas abertas à logística.
4. Identificar os primeiros riscos e priorizar os módulos mais incertos.
5. Combinar a comunicação: revisão ao fim de cada volta, reunião semanal e um responsável de cada lado.

### 3.2 Como o Espiral funciona neste projeto

Cada volta passa por quatro quadrantes: (1) determinar objetivos e alternativas; (2) analisar e reduzir riscos; (3) desenvolver e validar; (4) avaliar com o cliente e planejar a próxima volta.

| Volta | Objetivo | Protótipo / entrega | Risco principal atacado |
| --- | --- | --- | --- |
| 1 | Requisitos e viabilidade | Protótipo navegável das telas de cliente, entregador e administrador | Requisitos incompletos ou mal entendidos |
| 2 | Rastreamento e notificações | Módulo de status em tempo real com avisos por app e e-mail | Status inconsistente e falha de notificação |
| 3 | Rotas otimizadas | App do entregador com rota e atualização automática | Rota inviável e perda de sinal em campo |
| 4 | Relatórios e segurança | Painel de desempenho logístico e testes de segurança | Vazamento de dados e relatórios incorretos |
| 5 | Implantação | Versão final, treinamento e suporte | Resistência dos usuários e falhas em produção |

### 3.3 Justificativa

- **Clareza na comunicação:** o cliente vê algo concreto ao fim de cada volta, o que reduz mal-entendidos e transforma expectativas implícitas em requisitos escritos.
- **Agilidade na entrega:** entrega por módulos; o rastreamento (valor imediato ao cliente final) vem antes das rotas e dos relatórios.
- **Adaptação a mudanças:** o varejo online muda rápido; cada volta termina com avaliação e replanejamento.
- **Gestão de riscos:** dados financeiros, tempo real e múltiplos perfis pedem análise de riscos no centro de cada volta.

### 3.4 Por que não outros modelos

- **Cascata:** exige requisitos estáveis e só entrega no fim.
- **Prototipação isolada:** esclarece requisitos, mas não organiza a evolução até o produto final nem trata riscos de forma sistemática (por isso é usada dentro de cada volta).
- **Incremental/Scrum:** adequado pela agilidade, mas com menos destaque à análise formal de riscos, central aqui.

### 3.5 Limitações e como lidar

O Espiral exige experiência para avaliar riscos e tem custo de gerenciamento maior. Controle: registro de riscos atualizado, critérios claros de saída de cada volta e reserva de contingência de 10%.

## 4. Análise de riscos e segurança

Dez riscos principais, cada um com mitigação e verificação por teste. Probabilidade (P) e impacto (I): baixa, média ou alta.

| # | Risco | P / I | Mitigação | Verificação |
| --- | --- | --- | --- | --- |
| R1 | Vazamento de dados pessoais e financeiros | Média / Alta | TLS e criptografia em repouso; pagamentos via gateway certificado sem armazenar cartão; coleta mínima (LGPD); mascaramento em logs; plano de resposta a incidentes | Pentest e análise de vulnerabilidades a cada volta |
| R2 | Acesso indevido entre perfis | Média / Alta | RBAC validado no servidor; verificação de posse do recurso; 2FA para administradores; sessões com expiração | Testes automatizados de autorização por perfil |
| R3 | Status do pedido desatualizado ou inconsistente | Alta / Média | Fonte única de verdade; eventos com data e hora; fila de mensagens com reprocessamento; conciliação periódica | Testes de integração e ponta a ponta do fluxo do pedido |
| R4 | Rota inviável ou entrega atribuída a dois entregadores | Média / Alta | Atribuição transacional; validação de capacidade e janela; reotimização com ajuste manual do despachante | Simulação com dados históricos e testes de concorrência |
| R5 | Entregador sem conexão em campo | Alta / Média | Modo offline com rota em cache e sincronização posterior; registro local de eventos com data e hora | Testes de campo em áreas de sinal fraco |
| R6 | Falha no envio de notificações | Média / Média | Fila com novas tentativas; canal alternativo (e-mail se o push falhar); registro de entrega e erro; preferências e consentimento | Testes de envio e monitoramento da taxa de entrega |
| R7 | Indisponibilidade ou lentidão em picos de venda | Média / Alta | Infraestrutura escalável; cache; backups diários e plano de recuperação; monitoramento com alertas | Testes de carga e estresse antes de cada implantação |
| R8 | Relatórios com indicadores errados | Média / Alta | Definição formal aprovada pelos gestores; cálculo centralizado e versionado; trilha de auditoria | Conferência com conjunto de dados de referência |
| R9 | Falha nas integrações externas (mapas, ERP, transportadoras, pagamento) | Média / Alta | Contratos de API documentados; novas tentativas e circuit breaker; alternativa a provedores críticos | Testes de integração com mocks de falha |
| R10 | Mudança de requisitos, estouro de prazo e custo | Alta / Média | Espiral com replanejamento por volta; backlog priorizado; controle formal de mudanças; contingência de 10% | Acompanhamento de prazo e custo nas revisões de volta |

### Boas práticas de segurança

- **LGPD:** base legal para cada tratamento, coleta mínima, política de retenção e descarte, canal para o titular exercer direitos e indicação de um encarregado (DPO).
- **Segurança desde o projeto:** modelagem de ameaças na volta 1 e revisão de segurança em cada volta, com referência às boas práticas da OWASP.
- **Privilégio mínimo:** cada perfil acessa só o necessário; ações sensíveis do administrador ficam em log de auditoria.
- **Segredos e dependências:** chaves e senhas fora do código-fonte; verificação periódica de vulnerabilidades em bibliotecas.
- **Dados financeiros:** gateway aderente ao PCI DSS; o sistema trata apenas tokens, não números de cartão.

### Estratégia de testes

- **Unitários e de integração:** automatizados, a cada alteração.
- **Funcionais e de ponta a ponta:** caminho completo do pedido, da compra à entrega, nos três perfis.
- **Desempenho e carga:** picos de acessos e de atualizações de status.
- **Segurança:** análise estática, verificação de dependências e pentest antes da implantação.
- **Aceitação:** clientes, entregadores e administradores validam cada protótipo ou incremento.

Os riscos são reavaliados na fase de análise de riscos de cada volta: os mitigados saem da lista e os novos entram com plano de resposta.

## 5. Conclusão

Gerenciar um projeto de software vai além das decisões técnicas: exige equilibrar escopo, prazo, custo e qualidade e ouvir os perfis de usuários (cliente, entregador e administrador). As atividades metodológicas de Pressman estruturaram as etapas, e as atividades de apoio mostraram que acompanhar riscos, qualidade e mudanças é trabalho contínuo do gerente.

O Espiral foi a escolha mais adequada: o sistema reúne tempo real, otimização de rotas, integrações externas e dados financeiros — pontos incertos que precisam ser enfrentados cedo. A análise de riscos em cada volta e a avaliação do cliente ao final dela ajudam a comunicar, entregar valor por partes e lidar com mudanças. O custo do modelo (disciplina de gestão e experiência na avaliação de riscos) foi tratado com reserva de contingência e critérios de saída por volta.

Segurança e confiabilidade não podem ficar para o fim: vazamento de dados, acesso indevido entre perfis, status inconsistente e falhas de notificação exigem mitigação planejada e testes a cada volta. Em um sistema com dados pessoais e financeiros, a conformidade com a LGPD faz parte da qualidade do produto.

## Referências

- PRESSMAN, Roger S. *Engenharia de Software*. Seção 2.1: modelo de processo genérico.
- ROBERT HALF. Salário de Desenvolvedor(a) Back-End Pleno e cargos relacionados (Guia Salarial 2026/2027). https://www.roberthalf.com/br/pt/vagas-detalhes/desenvolvedora-back-end-pleno. Acesso em: nov. 2026.
- ROBERT HALF. Salário de Analista de Sistemas Sênior e cargos relacionados (Analista de Sistemas Pleno e Analista de DevOps). https://www.roberthalf.com/br/pt/vagas-detalhes/analista-de-sistemas-senior. Acesso em: nov. 2026.
- ROBERT HALF. Salário de Gerente de Projetos/PMO. https://www.roberthalf.com/br/pt/vagas-detalhes/gerente-de-projetospmo-pm. Acesso em: nov. 2026.
- JOBRISE. Salário de UX/UI Designer no Brasil 2026. https://jobrise.io/pt/blog/salario-ux-ui-designer-brasil-2026/. Acesso em: nov. 2026.
- CONTAJÁ. Calculadora de custo de funcionário CLT. https://contaja.com.br/lp/calculadora-custo-funcionario/. Acesso em: nov. 2026.
