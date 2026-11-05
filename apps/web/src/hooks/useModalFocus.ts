import {useEffect,useRef,type RefObject} from 'react';

export function useModalFocus(ref:RefObject<HTMLElement|null>,close:()=>void,busy=false,enabled=true){
 const latest=useRef({close,busy});latest.current={close,busy};
 const previous=useRef<HTMLElement|null>(null),wasEnabled=useRef(false);
 if(enabled&&!wasEnabled.current)previous.current=document.activeElement as HTMLElement|null;
 wasEnabled.current=enabled;
 useEffect(()=>{
  if(!enabled)return;
  (ref.current?.querySelector<HTMLElement>('input:not(:disabled)')??ref.current?.querySelector<HTMLElement>('button:not(:disabled)'))?.focus();
  const keyboard=(e:KeyboardEvent)=>{
   if(e.key==='Escape'&&!latest.current.busy){e.preventDefault();latest.current.close()}
   if(e.key!=='Tab')return;
   const elements=Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')??[]);
   const first=elements[0],last=elements.at(-1);if(!first)return;
   if(e.shiftKey&&(document.activeElement===first||!ref.current?.contains(document.activeElement))){e.preventDefault();last?.focus()}else if(!e.shiftKey&&(document.activeElement===last||!ref.current?.contains(document.activeElement))){e.preventDefault();first.focus()}
  };
  document.addEventListener('keydown',keyboard);return()=>{document.removeEventListener('keydown',keyboard);if(previous.current?.isConnected)previous.current.focus()};
 },[ref,enabled]);
}
