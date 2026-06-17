import { describe, expect, it } from 'vitest';
import { parseMetaEmbalagemBatchText } from './meta-embalagem-batch';

describe('parseMetaEmbalagemBatchText', () => {
  it('parseia linhas válidas com assadeira', () => {
    const text = `2026-06-09;2026-06-09;Valepan;HB Brioche 65g;1000;;
2026-06-09;2026-06-09;Valepan;HB Gergelim 65g;350;;lata nova`;

    const { rows, errors } = parseMetaEmbalagemBatchText(text);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[0].latas).toBe(1000);
    expect(rows[0].assadeira).toBe('');
    expect(rows[1].observacao).toBe('lata nova');
  });

  it('aceita formato legado sem coluna assadeira', () => {
    const text = `2026-06-09;2026-06-09;Valepan;HB Brioche 65g;1000;
2026-06-09;2026-06-09;Valepan;HB Gergelim 65g;350;lata nova`;

    const { rows, errors } = parseMetaEmbalagemBatchText(text);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[0].assadeira).toBe('');
    expect(rows[1].observacao).toBe('lata nova');
  });

  it('parseia assadeira informada', () => {
    const text = `2026-06-09;2026-06-09;Valepan;HB Brioche 65g;10;Assadeira 24;`;
    const { rows, errors } = parseMetaEmbalagemBatchText(text);
    expect(errors).toHaveLength(0);
    expect(rows[0].assadeira).toBe('Assadeira 24');
  });

  it('ignora linhas vazias e comentários', () => {
    const { rows } = parseMetaEmbalagemBatchText(`
# cabeçalho
2026-06-09;2026-06-09;Valepan;HB;3;;
`);
    expect(rows).toHaveLength(1);
  });

  it('detecta chave duplicada', () => {
    const text = `2026-06-09;2026-06-09;Valepan;HB;3;;obs
2026-06-09;2026-06-09;Valepan;HB;5;;obs`;
    const { errors } = parseMetaEmbalagemBatchText(text);
    expect(errors.some((e) => e.erro.includes('duplicada'))).toBe(true);
  });

  it('permite mesma meta com assadeiras diferentes', () => {
    const text = `2026-06-09;2026-06-09;Valepan;HB;3;Assadeira 24;obs
2026-06-09;2026-06-09;Valepan;HB;5;Assadeira 36;obs`;
    const { errors } = parseMetaEmbalagemBatchText(text);
    expect(errors.filter((e) => e.erro.includes('duplicada'))).toHaveLength(0);
  });
});
