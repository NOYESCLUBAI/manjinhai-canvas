import { Children, isValidElement, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Cpu } from 'lucide-react';
import './choice-popover.css';

type Option = { value: string | number; children: ReactNode; disabled?: boolean };
type Props = { children: ReactNode; value: string | number; disabled?: boolean; 'aria-label'?: string; onChange: (event: { target: { value: string } }) => void };
export function ChoicePopover({ children, value, disabled, onChange, 'aria-label': label = '选择设置' }: Props) {
  const options: Option[] = [];
  const collect = (items: ReactNode) => Children.forEach(items, child => {
    if (!isValidElement<Option>(child)) return;
    if (child.type === 'option') options.push(child.props);
    else collect(child.props.children);
  });
  collect(children);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, bottom: 0 });
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const isModel = label.includes('模型');
  const isRatio = label.includes('比例');
  const selected = options.find(option => String(option.value) === String(value));
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (rect) setPosition({ left: Math.max(12, Math.min(rect.left, window.innerWidth - 348)), bottom: window.innerHeight - rect.top + 12 });
    };
    update();
    const outside = (event: PointerEvent) => {
      if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    panel.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]:not(:disabled), button:not(:disabled)')?.focus();
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', key); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [open]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  return <><button ref={trigger} type="button" className="choice-trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined} disabled={disabled} onClick={() => setOpen(!open)}>{selected?.children || '请选择模型'}<ChevronDown size={12} /></button>
    {open && createPortal(<div ref={panel} className={`choice-popover ${isModel ? 'choice-models' : isRatio ? 'choice-ratios' : 'choice-segments'}`} style={position}>
      <div className="choice-heading">{label}</div>
      <div id={id} role="listbox" aria-label={label} className="choice-options" onKeyDown={event => {
        if (!['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
        event.preventDefault();
        const buttons = Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)') || []);
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (['ArrowDown','ArrowRight'].includes(event.key) ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next]?.focus();
      }}>
        {options.map(option => <button type="button" role="option" key={option.value} disabled={option.disabled} aria-selected={String(option.value) === String(value)} onClick={() => { onChange({target:{value:String(option.value)}}); setOpen(false); trigger.current?.focus(); }}>
          {isModel && <span className="choice-model-icon"><Cpu size={17}/></span>}
          {isRatio && <span className="choice-ratio-icon" style={{aspectRatio: /^\d+:\d+$/.test(String(option.value)) ? String(option.value).replace(':','/') : '1', width: String(option.value).startsWith('9:') || String(option.value).startsWith('3:4') ? 12 : 20 }} />}
          <span>{option.children}</span>{isModel && String(option.value) === String(value) && <Check size={16} className="choice-check"/>}
        </button>)}
      </div>
    </div>, document.body)}
  </>;
}
