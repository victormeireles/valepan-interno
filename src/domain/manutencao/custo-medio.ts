export class CustoMedio {
  entrada(
    saldoMilesimos: number,
    custoMedioCentavos: number | null,
    quantidadeMilesimos: number,
    precoCentavos: number,
  ): { saldoMilesimos: number; custoMedioCentavos: number } {
    const saldoNovo = saldoMilesimos + quantidadeMilesimos;
    if (saldoMilesimos <= 0 || custoMedioCentavos === null) {
      return { saldoMilesimos: saldoNovo, custoMedioCentavos: precoCentavos };
    }
    const numerador =
      BigInt(saldoMilesimos) * BigInt(custoMedioCentavos) +
      BigInt(quantidadeMilesimos) * BigInt(precoCentavos);
    return {
      saldoMilesimos: saldoNovo,
      custoMedioCentavos: this.dividirEmpateParaCima(numerador, BigInt(saldoNovo)),
    };
  }

  saida(
    saldoMilesimos: number,
    custoMedioCentavos: number | null,
    quantidadeMilesimos: number,
  ): {
    saldoMilesimos: number;
    custoMedioCentavos: number | null;
    precoUnitarioCentavos: number;
  } {
    return {
      saldoMilesimos: saldoMilesimos - quantidadeMilesimos,
      custoMedioCentavos,
      precoUnitarioCentavos: custoMedioCentavos ?? 0,
    };
  }

  valorCentavos(saldoMilesimos: number, custoMedioCentavos: number | null): number {
    if (custoMedioCentavos === null) return 0;
    const numerador = BigInt(saldoMilesimos) * BigInt(custoMedioCentavos);
    return this.dividirEmpateParaCima(numerador, 1000n);
  }

  private dividirEmpateParaCima(numerador: bigint, divisor: bigint): number {
    let quociente = numerador / divisor;
    let resto = numerador % divisor;
    if (divisor > 0n && resto < 0n) {
      quociente -= 1n;
      resto += divisor;
    }
    if (resto * 2n >= divisor) quociente += 1n;
    return Number(quociente);
  }
}
