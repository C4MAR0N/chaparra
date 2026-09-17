import { HardDrive, KeyRound, Download } from 'lucide-react';
import { Modal } from './ui';
export function PrivacyContent() {
  return (
    <div className="space-y-5 text-sm leading-relaxed text-stone-600">
      <section>
        <h3 className="mb-2 flex items-center gap-2 font-bold text-stone-900">
          <HardDrive size={20} /> Tus datos se quedan aquí
        </h3>
        <p>
          La cuenta, los animales, los registros y las fotos se guardan únicamente en este navegador
          y dispositivo. Chaparra no los envía a ningún servidor ni los comparte con otros usuarios
          de la aplicación. La fuente tipográfica se solicita a Google Fonts; si no hay conexión se
          utiliza la fuente del dispositivo.
        </p>
      </section>
      <section>
        <h3 className="mb-2 flex items-center gap-2 font-bold text-stone-900">
          <KeyRound size={20} /> Una cuenta local
        </h3>
        <p>
          Guardamos una comprobación de tu contraseña con PBKDF2 y una sal aleatoria, nunca la
          contraseña en claro. Los datos de la explotación no están cifrados. Una persona con acceso
          al navegador, a sus herramientas o a una sesión abierta podría leerlos. Protege el
          dispositivo y cierra la sesión si lo compartes.
        </p>
      </section>
      <section>
        <h3 className="mb-2 flex items-center gap-2 font-bold text-stone-900">
          <Download size={20} /> Haz una copia de seguridad
        </h3>
        <p>
          No hay copia de seguridad en la nube. Si borras los datos del navegador o pierdes el
          dispositivo, perderás la información. Exporta una copia JSON desde Ajustes y guárdala en
          un lugar seguro. La copia contiene los datos de tu explotación y tus datos
          identificativos, sin contraseñas ni claves de acceso; puedes importarla en otra cuenta
          local.
        </p>
      </section>
      <p>
        No podemos recuperar una contraseña olvidada ni enviar un correo para restablecerla. La
        aplicación abierta funciona sin conexión; volver a abrirla requiere que sus archivos estén
        disponibles. No incorpora instalación sin conexión ni sincronización.
      </p>
    </div>
  );
}
export function SecurityPrivacyModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Privacidad y almacenamiento" onClose={onClose}>
      <PrivacyContent />
    </Modal>
  );
}
