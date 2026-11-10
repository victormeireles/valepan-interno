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
    return this.dividirEmpateParaCima(numerador, BigInt(1000));
  }

  private dividirEmpateParaCima(numerador: bigint, divisor: bigint): number {
    const zero = BigInt(0);
    const um = BigInt(1);
    const dois = BigInt(2);
    let quociente = numerador / divisor;
    let resto = numerador % divisor;
    if (divisor > zero && resto < zero) {
      quociente -= um;
      resto += divisor;
    }
    if (resto * dois >= divisor) quociente += um;
    return Number(quociente);
  }
}
