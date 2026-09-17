import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button, Card } from './ui';
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    /* No se registran datos personales en consola. */
  }
  render() {
    return this.state.failed ? (
      <main className="mx-auto max-w-xl p-6 pt-20">
        <Card className="space-y-4">
          <AlertTriangle size={32} className="text-tierra-700" />
          <h1 className="page-heading">No hemos podido abrir esta pantalla</h1>
          <p className="text-stone-600">
            Vuelve a cargar Chaparra. Si el problema continúa, conserva los datos del navegador para
            no perder la información guardada.
          </p>
          <Button onClick={() => window.location.reload()}>Volver a cargar</Button>
        </Card>
      </main>
    ) : (
      this.props.children
    );
  }
}
