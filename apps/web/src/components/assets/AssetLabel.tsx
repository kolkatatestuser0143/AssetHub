'use client';

import { Printer, ScanLine, Settings2 } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useMemo, useState } from 'react';
import AssetOperationsPanel from './AssetOperationsPanel';

type LabelSize = 'compact' | 'standard' | 'large';
type LabelTemplate = 'standard' | 'compact';

type AssetLabelProps = { assetNumber: string; assetId: string; assetType?: string; model?: string; serialNumber?: string; location?: string; showControls?: boolean; printable?: boolean; initialSize?: LabelSize; initialTemplate?: LabelTemplate; };

const CODE128_PATTERNS = [
  '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213','221312','231212','112232','122132','122231','113222','123122','123221','223211','221132','221231','213212','223112','312131','311222','321122','321221','312212','322112','322211','212123','212321','232121','111323','131123','131321','112313','132113','132311','211313','231113','231311','112133','112331','132131','113123','113321','133121','313121','211331','231131','213113','213311','213131','311123','311321','331121','312113','312311','332111','314111','221411','431111','111224','111422','121124','121421','141122','141221','112214','112412','122114','122411','142112','142211','241211','221114','413111','241112','134111','111242','121142','121241','114212','124112','124211','411212','421112','421211','212141','214121','412121','111143','111341','131141','114113','114311','411113','411311','113141','114131','311141','411131','211412','211214','211232','2331112',
];

function encodeCode128B(value: string) { const safe = Array.from(value).filter((char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126).join('') || 'ASSET'; const codes = Array.from(safe).map((char) => char.charCodeAt(0) - 32); const checksum = (104 + codes.reduce((sum, code, index) => sum + code * (index + 1), 0)) % 103; return [104, ...codes, checksum, 106].map((code) => CODE128_PATTERNS[code]).join(''); }
function Code128Barcode({ value }: { value: string }) { const pattern = useMemo(() => encodeCode128B(value), [value]); let offset = 10; const bars: JSX.Element[] = []; for (let i = 0; i < pattern.length; i += 1) { const width = Number(pattern[i]); const isBar = i % 2 === 0; if (isBar) bars.push(<rect key={i} x={offset} y="0" width={width} height="48" fill="currentColor" />); offset += width; } return <svg viewBox={`0 0 ${offset + 10} 48`} className="h-12 w-full" preserveAspectRatio="none" role="img" aria-label={`Code 128 barcode for ${value}`}>{bars}</svg>; }

export default function AssetLabel({ assetNumber, assetId, assetType, model, serialNumber, location, showControls = true, printable = false, initialSize = 'standard', initialTemplate = 'standard' }: AssetLabelProps) {
  const [qr, setQr] = useState('');
  const [size, setSize] = useState<LabelSize>(initialSize);
  const [template, setTemplate] = useState<LabelTemplate>(initialTemplate);
  const stableUrl = typeof window === 'undefined' ? `/assets/${assetId}` : `${window.location.origin}/assets/${assetId}`;
  useEffect(() => { QRCode.toDataURL(stableUrl, { margin: 2, width: 320, errorCorrectionLevel: 'H', color: { dark: '#000000', light: '#ffffff' } }).then(setQr).catch(() => setQr('')); }, [stableUrl]);
  const displayModel = model || '', displaySerial = serialNumber || '', displayLocation = location || '', showDetails = template === 'standard';
  const labelClass = size === 'compact' ? 'asset-label asset-label-compact' : size === 'large' ? 'asset-label asset-label-large' : 'asset-label asset-label-standard';
  return <section className={`${printable ? '' : 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'} space-y-4`}>
    {!printable && <AssetOperationsPanel assetId={assetId} assetNumber={assetNumber} />}
    {showControls && <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between print:hidden"><div><h2 className="font-semibold text-slate-950">Asset label</h2><p className="mt-1 text-sm text-slate-500">Stable QR + Code 128 label for physical inventory handling.</p></div><div className="flex flex-wrap gap-2"><label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"><Settings2 size={14}/><span>Template</span><select value={template} onChange={(e) => setTemplate(e.target.value as LabelTemplate)} className="border-0 bg-transparent p-0 text-xs font-semibold outline-none"><option value="standard">Standard</option><option value="compact">Compact</option></select></label><label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"><span>Size</span><select value={size} onChange={(e) => setSize(e.target.value as LabelSize)} className="border-0 bg-transparent p-0 text-xs font-semibold outline-none"><option value="compact">2 × 1 in</option><option value="standard">3 × 2 in</option><option value="large">4 × 2 in</option></select></label><button onClick={() => window.print()} className="ui-interactive inline-flex items-center gap-2 rounded-xl bg-[var(--theme-primary)] px-3 py-2 text-sm font-semibold text-white"><Printer size={15}/>Print</button></div></div>}
    <div className={printable ? '' : 'overflow-x-auto'}><div className={labelClass} data-label-size={size} data-label-template={template}><div className="asset-label-brand">AssetHub</div><div className="asset-label-main"><div className="asset-label-qr-wrap">{qr ? <img src={qr} alt={`QR code for asset ${assetNumber}`} className="asset-label-qr"/> : <div className="asset-label-qr-placeholder">QR</div>}<span>Scan to open Asset 360</span></div><div className="asset-label-info"><div className="asset-label-number">{assetNumber}</div>{showDetails && <>{assetType && <div className="asset-label-line"><strong>Type</strong><span>{assetType}</span></div>}{displayModel && <div className="asset-label-line"><strong>Model</strong><span>{displayModel}</span></div>}{displaySerial && <div className="asset-label-line"><strong>Serial</strong><span>{displaySerial}</span></div>}{displayLocation && <div className="asset-label-line"><strong>Location</strong><span>{displayLocation}</span></div>}</>}<div className="asset-label-barcode"><Code128Barcode value={assetNumber}/><div className="asset-label-barcode-text">{assetNumber}</div></div></div></div></div></div>
  </section>;
}
