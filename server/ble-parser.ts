const UNIT_MAP: Record<number, string> = {
  0x01: "g",
  0x02: "ml",
  0x03: "ml_milk",
  0x04: "oz",
  0x05: "lb_oz",
  0x06: "fl_oz",
  0x07: "fl_oz_milk",
};

const GRAMS_CONVERSION: Record<string, number> = {
  g: 1,
  ml: 1,
  ml_milk: 1.03,
  oz: 28.3495,
  lb_oz: 28.3495,
  fl_oz: 29.5735,
  fl_oz_milk: 30.46,
};

const MAX_WEIGHT_G = 5000;

export interface ParsedPacket {
  pesoOriginal: number;
  unidadeOriginal: string;
  pesoGramas: number;
  stable: boolean;
}

export interface ParseError {
  error: true;
  message: string;
}

export function parseIcomonPacket(hex: string): ParsedPacket | ParseError {
  const clean = hex.replace(/[\s:-]/g, "").toLowerCase();

  if (!/^[0-9a-f]+$/.test(clean)) {
    return { error: true, message: "Pacote HEX contém caracteres inválidos." };
  }

  const byteLen = clean.length / 2;

  if (byteLen !== 14 && byteLen !== 20) {
    return { error: true, message: `Pacote HEX com tamanho inválido: ${byteLen} bytes (esperado 14 ou 20).` };
  }

  const bytes = Buffer.from(clean, "hex");

  try {
    if (byteLen === 14) {
      return parse14B(bytes);
    } else {
      return parse20B(bytes);
    }
  } catch {
    return { error: true, message: "Erro ao decodificar pacote HEX." };
  }
}

function parse14B(bytes: Buffer): ParsedPacket | ParseError {
  const ctrlByte = bytes[0];
  const stable = (ctrlByte & 0x20) !== 0;
  const unitCode = ctrlByte & 0x0F;
  const unit = UNIT_MAP[unitCode] || "g";

  const rawWeight = bytes.readUInt16BE(11);
  const divisor = (unit === "oz" || unit === "lb_oz" || unit === "fl_oz" || unit === "fl_oz_milk") ? 10 : 1;
  const pesoOriginal = rawWeight / divisor;

  const convFactor = GRAMS_CONVERSION[unit] ?? 1;
  const pesoGramas = Math.round(pesoOriginal * convFactor * 100) / 100;

  return { pesoOriginal, unidadeOriginal: unit, pesoGramas, stable };
}

function parse20B(bytes: Buffer): ParsedPacket | ParseError {
  const ctrlByte = bytes[0];
  const stable = (ctrlByte & 0x20) !== 0;
  const unitCode = ctrlByte & 0x0F;
  const unit = UNIT_MAP[unitCode] || "g";

  const rawWeight = bytes.readUInt16BE(3);
  const divisor = (unit === "oz" || unit === "lb_oz" || unit === "fl_oz" || unit === "fl_oz_milk") ? 10 : 1;
  const pesoOriginal = rawWeight / divisor;

  const convFactor = GRAMS_CONVERSION[unit] ?? 1;
  const pesoGramas = Math.round(pesoOriginal * convFactor * 100) / 100;

  return { pesoOriginal, unidadeOriginal: unit, pesoGramas, stable };
}

export function convertToGrams(peso: number, unidade: string): { pesoGramas: number; unidadeReconhecida: boolean } {
  const unitLower = unidade.toLowerCase();
  const factor = GRAMS_CONVERSION[unitLower];

  if (factor === undefined) {
    console.warn(`[BLE] Unidade desconhecida: "${unidade}". Usando fallback 1:1 para gramas.`);
    return { pesoGramas: Math.round(peso * 100) / 100, unidadeReconhecida: false };
  }

  return { pesoGramas: Math.round(peso * factor * 100) / 100, unidadeReconhecida: true };
}

export function validatePhysicalLimits(pesoGramas: number, maxG: number = MAX_WEIGHT_G): string | null {
  if (pesoGramas <= 0) {
    return "Peso deve ser maior que zero.";
  }
  if (pesoGramas > maxG) {
    return `Peso excede o limite máximo da balança (${maxG}g).`;
  }
  return null;
}

export function buildDedupSignature(userId: string, pesoGramas: number, unidade: string, macBalanca?: string | null): string {
  const mac = (macBalanca || "UNKNOWN").toUpperCase();
  const roundedWeight = Math.round(pesoGramas);
  return `${userId}:${roundedWeight}:${unidade}:${mac}`;
}

export function isValidHex(hex: string): boolean {
  const clean = hex.replace(/[\s:-]/g, "");
  return /^[0-9a-fA-F]+$/.test(clean) && clean.length % 2 === 0;
}
