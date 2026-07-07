import { HelpCircle } from 'lucide-react';

// Icono de ayuda contextual: al pasar el mouse (o enfocarlo con teclado)
// muestra una descripción de para qué sirve el campo o el dato.
// Uso: <label>Plazo — N <FieldTip tip="Duración del crédito en meses." /></label>
export default function FieldTip({ tip, className = '' }) {
  return (
    <span className={`fs-tip fs-help ${className}`.trim()} data-tip={tip} tabIndex={0} role="img" aria-label={tip}>
      <HelpCircle size={13} strokeWidth={2.2} />
    </span>
  );
}
