import { forwardRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export interface PrintKodeAksesData {
  employeeId: string
  employeeName: string
  nip: string
  pin: string
}

interface KodeAksesPrintProps {
  data: PrintKodeAksesData[]
}

const KodeAksesPrint = forwardRef<HTMLDivElement, KodeAksesPrintProps>(({ data }, ref) => {
  if (!data || data.length === 0) return null

  return (
    <div ref={ref} className="hidden print:block print:w-full print:bg-white print:text-black">
      {/* 
        We use CSS grid to arrange items. 
        Usually A4 height allows for around 2 cards of this size comfortably, maybe 3.
        We'll use a flex column with a page break inside avoid for each card.
      */}
      <div className="block w-full">
        {data.map((item) => (
          <div 
            key={item.employeeId} 
            className="w-full h-[13.5cm] p-5 border-b-2 border-dashed border-gray-400 break-inside-avoid flex flex-col justify-between overflow-hidden"
            style={{ pageBreakInside: 'avoid' }}
          >
            {/* Header / Kop */}
            <div className="text-center border-b-2 border-black pb-2 mb-4">
              <div className="flex items-center justify-center gap-3 mb-1">
                <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
                <div>
                  <h1 className="text-xl font-bold uppercase tracking-wider leading-tight">KARTU KODE AKSES PEGAWAI</h1>
                  <h2 className="text-lg font-semibold leading-tight">Sistem Informasi Keuangan MTs KH A Wahab Muhsin</h2>
                  <p className="text-xs mt-0.5">Kp. Bageur, Sukarapih, Sukarame, Kab. Tasikmalaya</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-full max-w-2xl text-base text-left mb-4">
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="py-1 font-semibold w-1/3">Nama Pegawai</td>
                      <td className="py-1 font-bold w-2/3 text-lg uppercase">: {item.employeeName}</td>
                    </tr>
                    <tr>
                      <td className="py-1 font-semibold w-1/3">NIP / ID Pegawai</td>
                      <td className="py-1 font-semibold w-2/3 text-base">: {item.nip || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="text-center mb-4">
                <p className="text-gray-600 mb-2 text-base font-medium">Gunakan PIN (Kode Akses) berikut untuk login ke sistem:</p>
                <div className="inline-block border-[3px] border-gray-800 rounded-xl px-10 py-4 bg-gray-50">
                  <span className="font-mono text-5xl font-extrabold tracking-[0.25em] text-gray-900 ml-3">
                    {item.pin}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer with QR */}
            <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-300">
              <div className="text-xs text-gray-600 max-w-md">
                <p className="font-bold mb-1 text-black">Instruksi Login:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Buka browser dan scan QR Code di samping.</li>
                  <li>Atau buka alamat web Sistem Keuangan.</li>
                  <li>Masukkan Nama dan PIN Anda dengan benar.</li>
                  <li>Jaga kerahasiaan PIN ini.</li>
                </ol>
              </div>
              <div className="text-center flex flex-col items-center ml-4">
                <div className="bg-white p-1.5 border-2 border-gray-300 rounded-lg inline-block mb-1">
                  <QRCodeSVG 
                    value={window.location.origin} 
                    size={72}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <p className="text-[10px] font-semibold text-gray-500">Scan untuk Login</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

KodeAksesPrint.displayName = 'KodeAksesPrint'

export default KodeAksesPrint
