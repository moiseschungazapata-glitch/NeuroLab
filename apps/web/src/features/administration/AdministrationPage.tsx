import { Cpu,ShieldCheck } from 'lucide-react';
import React from 'react';
import type { LaboratoryContext } from '../../hooks/useLaboratory';

export function AdministrationPage({context}:{context:LaboratoryContext}){
const {}=context;
return (<div className="two-cols"><section className="panel concept"><ShieldCheck size={30}/><h3>Espacio de demostración</h3><p>Los roles del documento se presentan como referencia. La autenticación y los permisos reales requieren un servidor y quedan pendientes.</p><dl>{['Administrador','Responsable de proyecto','Ingeniero / analista de IA','Revisor','Lector'].map(r=><React.Fragment key={r}><dt>{r}</dt><dd>Rol previsto</dd></React.Fragment>)}</dl></section><section className="panel concept"><Cpu size={30}/><h3>Estado del entorno</h3><dl><dt>Frontend</dt><dd><span className="badge green">Disponible</span></dd><dt>Persistencia</dt><dd>Navegador local</dd><dt>Motor de entrenamiento</dt><dd>Simulación</dd><dt>API / Base de datos</dt><dd>Sin conectar</dd></dl><p>Esta fase cubre la experiencia visual y el flujo de interacción. No implementa seguridad de producción ni procesamiento de datasets.</p></section></div>);
}
