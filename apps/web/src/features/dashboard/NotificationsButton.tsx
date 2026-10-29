import {Bell} from 'lucide-react';
import type {LaboratoryContext} from '../../hooks/useLaboratory';
import {dashboardSummary} from './summary';

export function NotificationsButton({context}:{context:LaboratoryContext}){
 const count=dashboardSummary(context).visibleAlerts.length;
 return <button className="icon-btn notifications-button" aria-label={`Notificaciones: ${count} alertas pendientes`} title="Ver alertas del espacio" onClick={context.openAlerts}><Bell size={18}/>{count>0&&<span className="notification-count" aria-hidden="true">{count}</span>}</button>
}
