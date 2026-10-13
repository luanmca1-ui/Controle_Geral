/**
 * Testes simples para separar mudança real de oscilação.
 *
 * Com 18 unidades comparadas toda semana, alguma sempre vai variar 6% por
 * acaso. Sem teste, o painel aponta problema onde não há e o dono aprende a
 * ignorar o alerta.
 */

export interface Resultado {
  /** diferença entre as duas janelas, na unidade do dado */
  diferenca: number;
  /** probabilidade de ver essa diferença se nada tivesse mudado */
  p: number;
  significativo: boolean;
  /** false quando não há amostra suficiente para testar */
  testavel: boolean;
}

const NAO_TESTAVEL: Resultado = {
  diferenca: 0,
  p: 1,
  significativo: false,
  testavel: false,
};

/** Aproximação da função de distribuição acumulada da normal padrão. */
function normalAcumulada(z: number): number {
  // Abramowitz e Stegun 26.2.17, erro menor que 7.5e-8
  const sinal = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;

  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x);

  return 0.5 * (1 + sinal * y);
}

function media(valores: number[]): number {
  return valores.reduce((total, valor) => total + valor, 0) / valores.length;
}

function varianciaAmostral(valores: number[]): number {
  if (valores.length < 2) return 0;
  const m = media(valores);
  return valores.reduce((total, valor) => total + (valor - m) ** 2, 0) / (valores.length - 1);
}

/**
 * Compara a média de duas amostras independentes (teste t de Welch).
 * Com n perto de 30 a distribuição t já se aproxima da normal, então o valor
 * de p sai da normal padrão. Para o uso aqui, decidir se vale olhar ou não,
 * a diferença é irrelevante.
 */
export function compararMedias(atual: number[], anterior: number[]): Resultado {
  if (atual.length < 5 || anterior.length < 5) return NAO_TESTAVEL;

  const mediaAtual = media(atual);
  const mediaAnterior = media(anterior);

  const erro =
    varianciaAmostral(atual) / atual.length +
    varianciaAmostral(anterior) / anterior.length;

  if (erro <= 0) return NAO_TESTAVEL;

  const t = (mediaAtual - mediaAnterior) / Math.sqrt(erro);
  const p = 2 * (1 - normalAcumulada(Math.abs(t)));

  return {
    diferenca: mediaAtual - mediaAnterior,
    p,
    significativo: p < 0.05,
    testavel: true,
  };
}

/** Compara duas proporções, por exemplo a fatia paga em dinheiro. */
export function compararProporcoes(
  sucessosAtual: number,
  totalAtual: number,
  sucessosAnterior: number,
  totalAnterior: number
): Resultado {
  if (totalAtual < 30 || totalAnterior < 30) return NAO_TESTAVEL;

  const pAtual = sucessosAtual / totalAtual;
  const pAnterior = sucessosAnterior / totalAnterior;
  const combinada = (sucessosAtual + sucessosAnterior) / (totalAtual + totalAnterior);

  const erro = Math.sqrt(
    combinada * (1 - combinada) * (1 / totalAtual + 1 / totalAnterior)
  );
  if (erro <= 0) return NAO_TESTAVEL;

  const z = (pAtual - pAnterior) / erro;
  const p = 2 * (1 - normalAcumulada(Math.abs(z)));

  return {
    diferenca: pAtual - pAnterior,
    p,
    significativo: p < 0.05,
    testavel: true,
  };
}
