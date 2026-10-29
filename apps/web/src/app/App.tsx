import {ProjectForm} from '../features/projects/ProjectForm';
import {NotificationsButton} from '../features/dashboard/NotificationsButton';
import { ArrowRight,Bell,ChevronDown,ChevronRight,CircleHelp,FlaskConical,LogOut,Menu,Network,Play,Plus,X } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { AdministrationPage } from '../features/administration/AdministrationPage';
import { ArchitecturesPage } from '../features/architectures/ArchitecturesPage';
import { families,type Family } from '../features/architectures/model';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { DatasetsPage } from '../features/datasets/DatasetsPage';
import { EvaluationPage } from '../features/evaluation/EvaluationPage';
import { FundamentalsPage } from '../features/fundamentals/FundamentalsPage';
import { ModelRegistryPage } from '../features/model-registry/ModelRegistryPage';
import { ProjectsPage } from '../features/projects/ProjectsPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { TrainingPage } from '../features/training/TrainingPage';
import { useLaboratory } from '../hooks/useLaboratory';
import { icons,modules } from './navigation';
export function App({onLogout}:{onLogout:()=>void}){
const context=useLaboratory();
const {collapsed,isMobile,page,mobile,setMobile,projects,setProjects,setProject,modal,setModal,setEditingProject,notice,setNotice,family,setFamily,running,toggleSidebar,go,start}=context;
const heading=<div className="page-heading"><div><div className="eyebrow">WORKSPACE / NEUROLAB</div><h1>{page===0?'Tu laboratorio, en perspectiva.':modules[page]}</h1><p>{['Diseña, experimenta y transforma datos en conocimiento.','Organiza tus ideas y construye el próximo experimento.','Comprende las piezas que dan vida a una red neuronal.','De una idea a una arquitectura. Capa por capa.','Datos bien preparados, mejores experimentos.','Sigue cada época de tu experimento.','Convierte resultados en decisiones.','Cada versión cuenta una historia.','Documenta y comparte lo que has aprendido.','Control y visibilidad de tu espacio de trabajo.'][page]}</p></div>{page===0||page===1?<button className="primary" onClick={()=>{setEditingProject(null);setModal(true)}}><Plus size={17}/> Nuevo proyecto</button>:page===3?<button className="primary" onClick={start}><Play size={15}/> Probar arquitectura</button>:<span className="demo-tag"><FlaskConical size={14}/> Entorno de demostración</span>}</div>;
return <div className={'app '+(!isMobile&&collapsed?'sidebar-collapsed':'')}><aside id="workspace-sidebar" inert={isMobile?!mobile:collapsed} className={mobile?'sidebar open':'sidebar'}><a className="brand" href="#" onClick={e=>{e.preventDefault();go(0)}}><span className="brand-symbol"><Network size={25}/></span><span>neuro<span className="light">lab</span><small>ENTERPRISE</small></span></a><div className="workspace"><span className="workspace-icon">N</span><div>Mi espacio de trabajo<small>Plan académico</small></div><ChevronDown size={14}/></div><div className="nav-label">ESPACIO DE TRABAJO</div><nav>{modules.map((m,i)=>{const Icon=icons[i];return <button key={m} className={page===i?'nav-item active':'nav-item'} onClick={()=>go(i)}><Icon size={18}/><span>{m}</span>{i===1&&<em>{projects.length}</em>}{i===5&&running&&<i className="live-dot"/>}</button>})}</nav><div className="sidebar-bottom"><button className="logout-button" onClick={onLogout}><LogOut size={18}/><span>Cerrar sesión</span></button><div className="learning-card"><span>APRENDE CONSTRUYENDO</span><h4>Una capa a la vez.</h4><p>Explora los fundamentos de las redes neuronales.</p><button onClick={()=>go(2)}>Ir a fundamentos <ArrowRight size={14}/></button></div><button className="help" onClick={()=>setNotice('Empieza por Proyectos y continúa con el Diseñador de redes. Los datos se guardan localmente.')}><CircleHelp size={17}/> Guía de primeros pasos</button><div className="profile"><span className="avatar">MC</span><div>Moisés Chunga<small>Analista de IA</small></div><span className="online"/></div></div></aside>{isMobile&&mobile&&<button className="sidebar-scrim" aria-label="Cerrar menú" onClick={()=>setMobile(false)}/>}<div className="main"><header><div className="header-context"><button className="icon-btn sidebar-toggle" aria-label={(isMobile?mobile:!collapsed)?"Ocultar menú":"Abrir menú"} aria-expanded={isMobile?mobile:!collapsed} aria-controls="workspace-sidebar" onClick={toggleSidebar}><Menu size={20}/></button><span className="header-label">Workspace</span><ChevronRight size={14}/><span>{modules[page]}</span></div><div className="header-right"><ThemeToggle/><span className="local-status"><i/> Demo local</span><NotificationsButton context={context}/><span className="avatar small">MC</span></div></header><main>{heading}
{page===0&&<DashboardPage context={context}/>}
{page===1&&<ProjectsPage context={context}/>}
{page===2&&<FundamentalsPage context={context}/>}
{page===3&&<ArchitecturesPage context={context}/>}
{page===4&&<DatasetsPage context={context}/>}
{page===5&&<TrainingPage context={context}/>}
{page===6&&<EvaluationPage context={context}/>}
{page===7&&<ModelRegistryPage context={context}/>}
{page===8&&<ReportsPage context={context}/>}
{page===9&&<AdministrationPage context={context}/>}
<footer><span><span className="footer-mark">✳</span> NeuroLab Enterprise <b>·</b> Diseñado para aprender, construido para explorar.</span><span>Semana 11 <span className="footer-dot">·</span> Frontend demo</span></footer></main></div>{notice&&<div className="toast" role="status"><CircleHelp size={18}/>{notice}<button className="icon-btn" aria-label="Cerrar notificación" onClick={()=>setNotice('')}><X size={16}/></button></div>}{modal&&<ProjectForm context={context}/>}</div>
}


