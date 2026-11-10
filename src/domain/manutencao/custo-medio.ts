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
    const quociente = numerador / divisor;
    const resto = numerador % divisor;
    if (resto * 2n >= divisor) return Number(quociente + 1n);
    return Number(quociente);
  }
}
