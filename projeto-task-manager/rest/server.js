// rest/server.js - Sistema DANGER ZONE API REST
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// Códigos de erro específicos do sistema
const ERROR_CODES = {
  AUTH_FAILED: 'DANGER_AUTH_001',
  INSUFFICIENT_CLEARANCE: 'DANGER_AUTH_002',
  VALIDATION_FAILED: 'DANGER_VAL_001',
  NOT_FOUND: 'DANGER_404',
  SYSTEM_FAILURE: 'DANGER_SYS_001'
};

// Armazenamento em memória - Banco de dados de registros de perigos
let dangerRegistry = [];

// Middleware de controle de acesso
const securityClearanceCheck = (req, res, next) => {
  const clearanceLevel = req.headers['security-clearance'];
  
  if (!clearanceLevel) {
    return res.status(401).json({
      code: ERROR_CODES.AUTH_FAILED,
      message: '⚠️ VIOLAÇÃO DE PROTOCOLO: Nível de autorização não fornecido',
      timestamp: new Date().toISOString()
    });
  }
  
  // Para exclusão, exige nível de segurança mais alto
  if (req.method === 'DELETE' && parseInt(clearanceLevel) < 4) {
    return res.status(403).json({
      code: ERROR_CODES.INSUFFICIENT_CLEARANCE,
      message: '🚫 ACESSO NEGADO: Nível de autorização insuficiente para operação de desativação',
      requiredLevel: 4,
      providedLevel: clearanceLevel,
      timestamp: new Date().toISOString()
    });
  }
  
  // Para adição de perigos extremos, exige nível de segurança específico
  if (req.method === 'POST' && 
      req.body.riskLevel === 'extreme' && 
      parseInt(clearanceLevel) < 3) {
    return res.status(403).json({
      code: ERROR_CODES.INSUFFICIENT_CLEARANCE,
      message: '🚫 ACESSO NEGADO: Autorização insuficiente para registrar perigos de nível extremo',
      requiredLevel: 3,
      providedLevel: clearanceLevel,
      timestamp: new Date().toISOString()
    });
  }
  
  // Adiciona o nível de autorização ao objeto de requisição para uso posterior
  req.securityClearance = parseInt(clearanceLevel);
  next();
};

// Middleware de validação de entrada
const validateDangerData = (req, res, next) => {
  const { title, riskLevel, category, location } = req.body;
  
  // Validações básicas
  if (!title || title.trim().length < 3) {
    return res.status(400).json({
      code: ERROR_CODES.VALIDATION_FAILED,
      message: '⚠️ DADOS INVÁLIDOS: Título do perigo deve conter ao menos 3 caracteres',
      field: 'title',
      timestamp: new Date().toISOString()
    });
  }
  
  // Validação de níveis de risco
  const validRiskLevels = ['extreme', 'high', 'moderate', 'low'];
  if (!riskLevel || !validRiskLevels.includes(riskLevel)) {
    return res.status(400).json({
      code: ERROR_CODES.VALIDATION_FAILED,
      message: '⚠️ DADOS INVÁLIDOS: Nível de risco inválido',
      field: 'riskLevel',
      validLevels: validRiskLevels,
      timestamp: new Date().toISOString()
    });
  }
  
  // Validação de categorias
  const validCategories = ['chemical', 'electrical', 'mechanical', 'biological', 'radiation'];
  if (!category || !validCategories.includes(category)) {
    return res.status(400).json({
      code: ERROR_CODES.VALIDATION_FAILED,
      message: '⚠️ DADOS INVÁLIDOS: Categoria de perigo inválida',
      field: 'category',
      validCategories: validCategories,
      timestamp: new Date().toISOString()
    });
  }
  
  // Validação de localização para perigos extremos
  if (riskLevel === 'extreme' && (!location || location.trim().length < 5)) {
    return res.status(400).json({
      code: ERROR_CODES.VALIDATION_FAILED,
      message: '⚠️ PROTOCOLO DE SEGURANÇA: Perigos extremos requerem localização detalhada',
      field: 'location',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// Rotas da API
// GET: Lista todos os perigos registrados, com filtros opcionais
app.get('/dangers', securityClearanceCheck, (req, res) => {
  const { riskLevel, category, minRating } = req.query;
  let filteredDangers = [...dangerRegistry];
  
  // Aplicar filtros se fornecidos
  if (riskLevel) {
    filteredDangers = filteredDangers.filter(danger => danger.riskLevel === riskLevel);
  }
  
  if (category) {
    filteredDangers = filteredDangers.filter(danger => danger.category === category);
  }
  
  if (minRating && !isNaN(parseInt(minRating))) {
    const minRatingValue = parseInt(minRating);
    filteredDangers = filteredDangers.filter(danger => danger.consequenceRating >= minRatingValue);
  }
  
  // Adiciona metadados à resposta
  const response = {
    statusCode: 200,
    timestamp: new Date().toISOString(),
    totalCount: filteredDangers.length,
    securityLevel: req.securityClearance,
    data: filteredDangers
  };
  
  // Log de auditoria
  console.log(`[${new Date().toISOString()}] 🔍 CONSULTA: ${filteredDangers.length} perigos recuperados - Autorização: Nível ${req.securityClearance}`);
  
  res.json(response);
});

// GET: Recupera um perigo específico por ID
app.get('/dangers/:id', securityClearanceCheck, (req, res) => {
  const danger = dangerRegistry.find(item => item.id === req.params.id);
  
  if (!danger) {
    return res.status(404).json({
      code: ERROR_CODES.NOT_FOUND,
      message: '⚠️ REGISTRO NÃO ENCONTRADO: ID de perigo inválido ou removido',
      timestamp: new Date().toISOString()
    });
  }
  
  // Log de auditoria para acessos a perigos extremos
  if (danger.riskLevel === 'extreme') {
    console.log(`[${new Date().toISOString()}] ⚠️ ALERTA: Acesso a perigo EXTREMO (ID: ${danger.id}) - Autorização: Nível ${req.securityClearance}`);
  }
  
  // Resposta com metadados
  const response = {
    statusCode: 200,
    timestamp: new Date().toISOString(),
    securityLevel: req.securityClearance,
    data: danger
  };
  
  res.json(response);
});

// POST: Registra um novo perigo
app.post('/dangers', securityClearanceCheck, validateDangerData, (req, res) => {
  const { title, description, riskLevel, category, location, consequenceRating } = req.body;
  
  // Geração de ID único para o registro de perigo
  const dangerID = uuidv4();
  
  // Criação do novo registro
  const newDanger = {
    id: dangerID,
    title,
    description: description || 'Detalhes não fornecidos - Protocolo padrão em vigor',
    riskLevel,
    category,
    location: location || 'Localização desconhecida - CUIDADO REDOBRADO',
    consequenceRating: consequenceRating || 5,
    dateReported: new Date().toISOString(),
    lastInspection: new Date().toISOString(),
    reportedBy: `Operador de Segurança #${req.securityClearance}`,
    status: 'active'
  };
  
  // Mensagem específica baseada no nível de risco
  let alertMessage;
  switch(riskLevel) {
    case 'extreme':
      alertMessage = '🚨 PERIGO CRÍTICO REGISTRADO - EVACUAÇÃO RECOMENDADA';
      break;
    case 'high':
      alertMessage = '⚠️ PERIGO GRAVE REGISTRADO - ACESSO RESTRITO';
      break;
    case 'moderate':
      alertMessage = '⚠️ PERIGO MODERADO REGISTRADO - EQUIPAMENTO DE PROTEÇÃO OBRIGATÓRIO';
      break;
    default:
      alertMessage = '⚠️ PERIGO DE BAIXO NÍVEL REGISTRADO - PROTOCOLO PADRÃO';
  }
  
  // Adiciona o registro ao banco de dados
  dangerRegistry.push(newDanger);
  
  // Log de auditoria
  console.log(`[${new Date().toISOString()}] ${alertMessage} - ID: ${dangerID} - Registrado por: Nível ${req.securityClearance}`);
  
  // Resposta com metadados
  const response = {
    statusCode: 201,
    timestamp: new Date().toISOString(),
    message: alertMessage,
    securityLevel: req.securityClearance,
    data: newDanger
  };
  
  res.status(201).json(response);
});

// DELETE: Remove um registro de perigo
app.delete('/dangers/:id', securityClearanceCheck, (req, res) => {
  const dangerIndex = dangerRegistry.findIndex(item => item.id === req.params.id);
  
  if (dangerIndex === -1) {
    return res.status(404).json({
      code: ERROR_CODES.NOT_FOUND,
      message: '⚠️ OPERAÇÃO FALHOU: Registro de perigo não encontrado',
      timestamp: new Date().toISOString()
    });
  }
  
  // Informações do perigo para o log
  const removedDanger = dangerRegistry[dangerIndex];
  
  // Remove o perigo do registro
  dangerRegistry.splice(dangerIndex, 1);
  
  // Log de auditoria com detalhes
  console.log(`[${new Date().toISOString()}] 🚫 PERIGO REMOVIDO - ID: ${removedDanger.id} - Título: ${removedDanger.title} - Autorização: Nível ${req.securityClearance}`);
  
  // Resposta específica para exclusão com metadados
  const response = {
    statusCode: 200,
    timestamp: new Date().toISOString(),
    message: '✅ REGISTRO DE PERIGO REMOVIDO COM SUCESSO - ATUALIZAR PROTOCOLOS DE SEGURANÇA',
    securityLevel: req.securityClearance,
    removedDangerID: removedDanger.id
  };
  
  res.json(response);
});

// Middleware para lidar com rotas não encontradas
app.use((req, res) => {
  res.status(404).json({
    code: ERROR_CODES.NOT_FOUND,
    message: '⚠️ ERRO DE NAVEGAÇÃO: Rota de acesso não autorizada ou inexistente',
    timestamp: new Date().toISOString()
  });
});

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] 🔥 ERRO CRÍTICO DO SISTEMA: ${err.message}`);
  
  res.status(500).json({
    code: ERROR_CODES.SYSTEM_FAILURE,
    message: '🔥 FALHA CRÍTICA NO SISTEMA DE CONTROLE DE PERIGOS',
    timestamp: new Date().toISOString()
  });
});

// Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║  🚨 DANGER ZONE - SISTEMA DE CONTROLE DE PERIGOS  ║
  ╠═══════════════════════════════════════════════════╣
  ║  Status: ONLINE                                   ║
  ║  Porta: ${PORT}                                      ║
  ║  Hora de ativação: ${new Date().toISOString()}   ║
  ║  PROTOCOLOS DE SEGURANÇA: ATIVOS                 ║
  ╚═══════════════════════════════════════════════════╝
  `);
});