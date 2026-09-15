import { create } from 'zustand';
import { Checklist, initialChecklists } from './mock-data';
type State={ checklists:Checklist[]; updateStatus:(id:string,status:Checklist['status'])=>void; addChecklist:(data:Omit<Checklist,'id'|'progress'>)=>void };
export const useChecklistStore=create<State>((set)=>({checklists:initialChecklists,updateStatus:(id,status)=>set(s=>({checklists:s.checklists.map(x=>x.id===id?{...x,status,progress:status==='Finalizado'||status==='Aprobado'?100:x.progress}:x)})),addChecklist:(data)=>set(s=>({checklists:[{...data,id:`CL-${2050+s.checklists.length}`,progress:0},...s.checklists]}))}));
