# Capacidades da Plataforma

## Visão geral

Esta plataforma foi construída para centralizar o provisionamento, a operação e o controle de dispositivos da linha Khomp K2000, com foco na gestão de devices, grupos, chamadas SIP e automações de áudio a partir de uma interface web.

O sistema sobe internamente toda a base necessária para a operação:

- Asterisk para gerenciar ramais, registro SIP e chamadas.
- Broker MQTT para comunicação e controle dos devices pela interface web.
- Backend e frontend para provisionamento, operação e monitoramento da plataforma.

## O que a plataforma faz hoje

### 1. Cadastro e provisionamento de devices

A plataforma permite cadastrar novos devices e vinculá-los a grupos. Durante esse processo, o sistema já executa automaticamente o provisionamento técnico necessário para o funcionamento do device:

- cria um ramal SIP para o device;
- gera usuário SIP e senha SIP;
- cria o tópico MQTT do equipamento;
- envia a configuração inicial do device;
- publica a configuração no Asterisk;
- tenta registrar o device automaticamente na infraestrutura.

Na prática, o operador não precisa criar manualmente credenciais ou arquivos de PBX para cada novo equipamento.

### 2. Gestão de grupos

Os devices podem ser organizados em grupos dentro da plataforma.

Cada grupo:

- possui identificação própria;
- recebe um ramal próprio;
- pode concentrar múltiplos devices;
- pode ser usado como destino de chamada em grupo.

Isso permite estruturar a operação por setor, local, unidade ou cenário de uso.

### 3. Chamada em grupo e chamada individual

A plataforma suporta dois modelos principais de chamada:

- chamada individual para um device específico;
- chamada em grupo por meio do ramal do grupo.

Na prática, isso permite um comportamento próximo de conferência ou broadcast operacional entre os devices pertencentes ao mesmo grupo, além da chamada direta para um único equipamento quando necessário.

### 4. Softphone web integrado

A própria interface web pode receber e originar chamadas.

Isso significa que:

- o usuário autenticado na plataforma possui ramal SIP próprio;
- se um device for configurado para ligar para o ramal do usuário, a chamada chega na interface web;
- o operador pode atender essa chamada diretamente no navegador;
- o operador também pode iniciar chamadas da interface web para devices e grupos.

Com isso, a plataforma funciona não apenas como painel de gestão, mas também como ponto ativo de comunicação.

### 5. Controle do device via broker MQTT

O broker MQTT faz parte da arquitetura da solução e é usado como canal de controle dos devices.

Esse modelo permite:

- provisionamento inicial do equipamento;
- troca de comandos com o device;
- monitoramento de presença e status de conexão;
- sincronização do estado do equipamento com a interface administrativa.

Em outras palavras, o device não é apenas cadastrado na plataforma: ele também pode ser controlado operacionalmente a partir dela.

### 6. Gestão de áudio pela interface web

A plataforma já possui uma camada de gerenciamento de áudio para os devices.

Hoje é possível:

- enviar arquivos de áudio pela interface web;
- trabalhar com formatos comuns de áudio enviados pelo navegador/backend;
- reproduzir áudio no device;
- pausar e retomar execuções de áudio;
- enviar áudio pré-gravado;
- disparar gravações e reproduções operacionais sem depender de configuração manual no equipamento.

Essa funcionalidade atende cenários como avisos operacionais, chamadas assistidas, testes de reprodução e comunicação rápida com os devices.

### 7. Criação automática de ramais e senhas

Sempre que um novo device ou um novo grupo é criado, a plataforma gera automaticamente a identidade necessária para operação.

Isso inclui:

- ramal do grupo;
- ramal do device;
- usuário SIP;
- senha SIP;
- vínculos internos necessários no Asterisk.

Esse processo reduz erro operacional e elimina a necessidade de configurar manualmente cada item no PBX.

## Fluxo operacional resumido

De forma simples, o fluxo atual da solução funciona assim:

1. o administrador acessa a plataforma web;
2. cria grupos de operação;
3. cadastra devices dentro desses grupos;
4. a plataforma gera automaticamente credenciais e ramais;
5. o backend provisiona Asterisk e MQTT;
6. os devices passam a ser controláveis pela interface;
7. o operador pode realizar chamadas individuais, chamadas em grupo e ações de áudio;
8. a interface web também pode receber chamadas destinadas ao ramal do usuário.

## Benefícios práticos do projeto

Os principais ganhos entregues hoje pela plataforma são:

- centralização da operação em uma única interface;
- provisionamento automático de devices e grupos;
- redução de configuração manual no Asterisk;
- comunicação bidirecional entre plataforma e devices;
- operação de chamadas diretamente pelo navegador;
- gestão de áudio e comandos sem depender de acesso direto ao equipamento;
- modelo escalável para múltiplos grupos e múltiplos devices.

## Resumo executivo

Em termos de produto, a plataforma já entrega uma base funcional para operação de devices da linha K200 com:

- cadastro e provisionamento automático;
- controle via Asterisk e MQTT;
- gestão por grupos;
- chamadas individuais e em grupo;
- reprodução e gerenciamento de áudio;
- atendimento de chamadas diretamente na interface web.

Ou seja, trata-se de uma plataforma que não apenas lista devices, mas efetivamente gerencia comunicação, áudio, ramais e operação diária dos equipamentos a partir de um único painel.
