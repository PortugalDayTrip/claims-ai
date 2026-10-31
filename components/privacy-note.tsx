// RGPD art. 13 notice — shown at first data collection (FNOL) and in the portal.
// Covers health data (art. 9), EXIF/GPS metadata and retention.

export default function PrivacyNote({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`rounded-xl bg-[#f2f2f7] p-4 text-[11px] leading-relaxed text-[#6e6e73] ${compact ? '' : 'mt-4'}`}>
      <p className="font-semibold text-[#1d1d1f]">Aviso de privacidade (RGPD)</p>
      <p className="mt-1">
        Os dados que fornece são tratados pela seguradora para gestão do sinistro
        (base legal: execução do contrato e obrigação legal). Informação sobre
        <b> feridos pode constituir dado de saúde</b> — indique apenas quem ficou
        ferido, sem diagnósticos. Fotos podem conter metadados (data/GPS da foto)
        usados exclusivamente para verificação de fraude.
      </p>
      <p className="mt-1">
        Pode exercer direitos de acesso, retificação e apagamento, e
        <b> pedir revisão humana de qualquer análise automática</b> (art. 22 RGPD).
        Reclamações: Gestor de Reclamações da seguradora,{' '}
        <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noreferrer" className="underline">
          livroreclamacoes.pt
        </a>{' '}
        ou{' '}
        <a href="https://www.consumidor.asf.com.pt" target="_blank" rel="noreferrer" className="underline">
          consumidor.asf.com.pt
        </a>
        .
      </p>
    </div>
  )
}
