// graphql/server.js - Sistema DANGER ZONE API GraphQL
const { ApolloServer, gql } = require('apollo-server');
const { v4: uuidv4 } = require('uuid');

// Definição do Schema GraphQL
const typeDefs = gql`
  "Níveis de risco do perigo - impactam protocolos de segurança"
  enum RiskLevel {
    extreme
    high
    moderate
    low
  }
  
  "Categorias de perigo - determinam equipamentos de proteção"
  enum DangerCategory {
    chemical
    electrical
    mechanical
    biological
    radiation
  }
  
  "Status do perigo no sistema"
  enum DangerStatus {
    active
    contained
    mitigated
    eliminated
  }
  
  "Registro completo de um perigo"
  type Danger {
    "Identificador único do perigo"
    id: ID!
    
    "Título descritivo do perigo"
    title: String!
    
    "Detalhes sobre o perigo e procedimentos de prevenção"
    description: String
    
    "Nível de risco classificado"
    riskLevel: RiskLevel!
    
    "Categoria do perigo"
    category: DangerCategory!
    
    "Localização exata do perigo - ESTRITAMENTE CONTROLADO"
    location: String!
    
    "Classificação de severidade (1-10)"
    consequenceRating: Int!
    
    "Data e hora de registro inicial"
    dateReported: String!
    
    "Última inspeção de segurança"
    lastInspection: String!
    
    "Operador que reportou o perigo"
    reportedBy: String!
    
    "Status atual do perigo"
    status: DangerStatus!
    
    "Equipamentos de proteção recomendados"
    protectiveEquipment: [String]
    
    "Procedimentos de contenção"
    containmentProcedures: [String]
  }
  
  "Estatísticas do registro de perigos"
  type DangerStats {
    "Total de perigos registrados"
    totalCount: Int!
    
    "Perigos por nível de risco"
    byRiskLevel: [RiskLevelCount!]!
    
    "Perigos por categoria"
    byCategory: [CategoryCount!]!
    
    "Níveis críticos - requerem atenção imediata"
    criticalLevels: Int!
  }
  
  "Contagem por nível de risco"
  type RiskLevelCount {
    riskLevel: RiskLevel!
    count: Int!
  }
  
  "Contagem por categoria"
  type CategoryCount {
    category: DangerCategory!
    count: Int!
  }
  
  "Log de auditoria de segurança"
  type SecurityLog {
    timestamp: String!
    operation: String!
    dangerId: ID
    details: String!
    operatorLevel: Int!
  }
  
  type Query {
    "Obter todos os perigos registrados"
    dangers: [Danger!]!
    
    "Obter um perigo específico por ID"
    danger(id: ID!): Danger
    
    "Filtra perigos por nível de risco"
    dangersByRiskLevel(level: RiskLevel!): [Danger!]!
    
    "Filtra perigos por categoria"
    dangersByCategory(category: DangerCategory!): [Danger!]!
    
    "Estatísticas gerais dos perigos registrados"
    dangerStats: DangerStats!
    
    "Logs de segurança - REQUER NÍVEL DE AUTORIZAÇÃO 5"
    securityLogs(limit: Int): [SecurityLog!]!
  }
  
  type Mutation {
    "Registrar um novo perigo no sistema"
    createDanger(
      title: String!,
      description: String,
      riskLevel: RiskLevel!,
      category: DangerCategory!,
      location: String!,
      consequenceRating: Int!,
      protectiveEquipment: [String!],
      containmentProcedures: [String!]
    ): Danger!
    
    "Remover um registro de perigo - REQUER NÍVEL DE AUTORIZAÇÃO 4"
    deleteDanger(id: ID!): Boolean!
    
    "Atualizar o status de um perigo - REQUER NÍVEL DE AUTORIZAÇÃO 3"
    updateDangerStatus(id: ID!, status: DangerStatus!): Danger!
    
    "Registrar uma nova inspeção"
    recordInspection(id: ID!): Danger!
  }
`;

// Armazenamento em memória - Banco de dados simulado
let dangerRegistry = [];
let securityLogs = [];

// Função para registrar logs de segurança
const logSecurityAction = (action, dangerId, details, level) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    operation: action,
    dangerId: dangerId || null,
    details: details,
    operatorLevel: level
  };
  
  securityLogs.push(logEntry);
  console.log(`[${logEntry.timestamp}] 🔒 LOG: ${action} - ${details} - Operador Nível ${level}`);
  
  return logEntry;
};

// Função de validação de nível de acesso
const requireSecurityLevel = (context, level, operation) => {
  if (!context.securityLevel) {
    throw new Error('🚫 ACESSO NEGADO: Credenciais de segurança não fornecidas');
  }
  
  if (context.securityLevel < level) {
    throw new Error(`🚫 ACESSO NEGADO: Nível ${level} requerido para ${operation}, fornecido: ${context.securityLevel}`);
  }
  
  return true;
};

// Resolvers para as queries e mutations
const resolvers = {
  Query: {
    dangers: (_, __, context) => {
      requireSecurityLevel(context, 1, 'consultar perigos');
      logSecurityAction('CONSULTA', null, 'Lista completa de perigos recuperada', context.securityLevel);
      return dangerRegistry;
    },
    
    danger: (_, { id }, context) => {
      requireSecurityLevel(context, 1, 'consultar perigo específico');
      const danger = dangerRegistry.find(d => d.id === id);
      
      if (!danger) {
        throw new Error('⚠️ REGISTRO NÃO ENCONTRADO: ID de perigo inválido ou removido');
      }
      
      logSecurityAction('CONSULTA', id, `Perigo ID: ${id} acessado`, context.securityLevel);
      return danger;
    },
    
    dangersByRiskLevel: (_, { level }, context) => {
      requireSecurityLevel(context, 1, 'consultar perigos por nível');
      
      // Perigos extremos requerem nível 2
      if (level === 'extreme') {
        requireSecurityLevel(context, 2, 'consultar perigos extremos');
      }
      
      const filtered = dangerRegistry.filter(d => d.riskLevel === level);
      logSecurityAction('CONSULTA', null, `Filtro por nível de risco: ${level} (${filtered.length} resultados)`, context.securityLevel);
      return filtered;
    },
    
    dangersByCategory: (_, { category }, context) => {
      requireSecurityLevel(context, 1, 'consultar perigos por categoria');
      
      const filtered = dangerRegistry.filter(d => d.category === category);
      logSecurityAction('CONSULTA', null, `Filtro por categoria: ${category} (${filtered.length} resultados)`, context.securityLevel);
      return filtered;
    },
    
    dangerStats: (_, __, context) => {
      requireSecurityLevel(context, 2, 'consultar estatísticas');
      
      // Contagem por nível de risco
      const riskLevels = ['extreme', 'high', 'moderate', 'low'];
      const byRiskLevel = riskLevels.map(level => ({
        riskLevel: level,
        count: dangerRegistry.filter(d => d.riskLevel === level).length
      }));
      
      // Contagem por categoria
      const categories = ['chemical', 'electrical', 'mechanical', 'biological', 'radiation'];
      const byCategory = categories.map(cat => ({
        category: cat,
        count: dangerRegistry.filter(d => d.category === cat).length
      }));
      
      // Contagem de níveis críticos (extreme + high)
      const criticalLevels = dangerRegistry.filter(d => 
        d.riskLevel === 'extreme' || d.riskLevel === 'high'
      ).length;
      
      logSecurityAction('CONSULTA', null, 'Estatísticas de perigos acessadas', context.securityLevel);
      
      return {
        totalCount: dangerRegistry.length,
        byRiskLevel,
        byCategory,
        criticalLevels
      };
    },
    
    securityLogs: (_, { limit }, context) => {
      // Requer alto nível de acesso
      requireSecurityLevel(context, 5, 'acessar logs de segurança');
      
      logSecurityAction('ADMIN', null, 'Logs de segurança acessados', context.securityLevel);
      
      // Retorna os logs mais recentes primeiro, limitados se especificado
      const sortedLogs = [...securityLogs].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      
      return limit ? sortedLogs.slice(0, limit) : sortedLogs;
    }
  },
  
  Mutation: {
    createDanger: (_, args, context) => {
      // Requer nível básico para perigos comuns
      requireSecurityLevel(context, 2, 'registrar perigo');
      
      // Nível extremo requer autorização maior
      if (args.riskLevel === 'extreme') {
        requireSecurityLevel(context, 3, 'registrar perigo extremo');
      }
      
      // Validação específica para perigos extremos
      if (args.riskLevel === 'extreme' && args.consequenceRating < 7) {
        throw new Error('⚠️ INCONSISTÊNCIA DE DADOS: Perigos extremos devem ter classificação de consequência 7-10');
      }
      
      const newDanger = {
        id: uuidv4(),
        title: args.title,
        description: args.description || 'ALERTA: Detalhes não fornecidos',
        riskLevel: args.riskLevel,
        category: args.category,
        location: args.location,
        consequenceRating: args.consequenceRating,
        dateReported: new Date().toISOString(),
        lastInspection: new Date().toISOString(),
        reportedBy: `Operador de Segurança #${context.securityLevel}`,
        status: 'active',
        protectiveEquipment: args.protectiveEquipment || [],
        containmentProcedures: args.containmentProcedures || []
      };
      
      dangerRegistry.push(newDanger);
      
      // Mensagem específica para o log
      let alertLevel;
      switch(args.riskLevel) {
        case 'extreme': alertLevel = '🚨 CRÍTICO'; break;
        case 'high': alertLevel = '⚠️ GRAVE'; break;
        case 'moderate': alertLevel = '⚠️ MODERADO'; break;
        default: alertLevel = 'BAIXO';
      }
      
      logSecurityAction('REGISTRO', newDanger.id, 
                       `${alertLevel} - ${args.title} - Categoria: ${args.category}`, 
                       context.securityLevel);
      
      return newDanger;
    },
    
    deleteDanger: (_, { id }, context) => {
      // Requer nível elevado para remover registros
      requireSecurityLevel(context, 4, 'remover registro de perigo');
      
      const dangerIndex = dangerRegistry.findIndex(d => d.id === id);
      
      if (dangerIndex === -1) {
        throw new Error('⚠️ REGISTRO NÃO ENCONTRADO: ID de perigo inválido ou já removido');
      }
      
      // Guarda informações para o log
      const dangerInfo = dangerRegistry[dangerIndex];
      
      // Perigos extremos requerem autorização máxima
      if (dangerInfo.riskLevel === 'extreme') {
        requireSecurityLevel(context, 5, 'remover perigo extremo');
      }
      
      // Remove o perigo
      dangerRegistry.splice(dangerIndex, 1);
      
      logSecurityAction('REMOÇÃO', id, 
                       `Perigo removido: ${dangerInfo.title} - Nível: ${dangerInfo.riskLevel}`, 
                       context.securityLevel);
      
      return true;
    },
    
    updateDangerStatus: (_, { id, status }, context) => {
      // Requer nível de acesso moderado
      requireSecurityLevel(context, 3, 'atualizar status de perigo');
      
      const dangerIndex = dangerRegistry.findIndex(d => d.id === id);
      
      if (dangerIndex === -1) {
        throw new Error('⚠️ REGISTRO NÃO ENCONTRADO: ID de perigo inválido ou removido');
      }
      
      // Atualiza o status
      dangerRegistry[dangerIndex].status = status;
      
      logSecurityAction('ATUALIZAÇÃO', id, 
                       `Status atualizado para: ${status}`, 
                       context.securityLevel);
      
      return dangerRegistry[dangerIndex];
    },
    
    recordInspection: (_, { id }, context) => {
      // Requer nível básico
      requireSecurityLevel(context, 2, 'registrar inspeção');
      
      const dangerIndex = dangerRegistry.findIndex(d => d.id === id);
      
      if (dangerIndex === -1) {
        throw new Error('⚠️ REGISTRO NÃO ENCONTRADO: ID de perigo inválido ou removido');
      }
      
      // Atualiza a data de inspeção
      dangerRegistry[dangerIndex].lastInspection = new Date().toISOString();
      
      logSecurityAction('INSPEÇÃO', id, 
                       `Inspeção registrada para perigo: ${dangerRegistry[dangerIndex].title}`, 
                       context.securityLevel);
      
      return dangerRegistry[dangerIndex];
    }
  }
};

// Inicializar o servidor Apollo
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    // Extrai o nível de segurança do cabeçalho
    const securityHeader = req.headers.authorization || '';
    
    // Formato esperado: "SecurityLevel 3"
    const securityLevel = securityHeader.startsWith('SecurityLevel ')
      ? parseInt(securityHeader.split(' ')[1], 10)
      : 0;
    
    return { securityLevel };
  },
  formatError: (err) => {
    // Personaliza as mensagens de erro
    console.error(`[${new Date().toISOString()}] ❌ ERRO: ${err.message}`);
    
    return {
      message: err.message,
      code: err.extensions?.code || 'DANGER_ERROR',
      timestamp: new Date().toISOString()
    };
  }
});

// Inicia o servidor
server.listen({ port: 4000 }).then(({ url }) => {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║  🚨 DANGER ZONE - GRAPHQL SECURITY INTERFACE     ║
  ╠═══════════════════════════════════════════════════╣
  ║  Status: ONLINE                                   ║
  ║  Interface: ${url}                              ║
  ║  Hora de ativação: ${new Date().toISOString()}   ║
  ║  PROTOCOLOS DE SEGURANÇA: ATIVOS                 ║
  ╚═══════════════════════════════════════════════════╝
  `);
});