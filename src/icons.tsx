// Material Symbols (outlined) as inline SVG: no icon font download, no emoji (ui-ux-pro-max checklist).
const svg = (d: string) => (props: { label?: string }) => (
  <svg width="24" height="24" viewBox="0 -960 960 960" fill="currentColor" role={props.label ? 'img' : undefined}
    aria-label={props.label} aria-hidden={props.label ? undefined : true}><path d={d} /></svg>
);
export const IconBack = svg('m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z');
export const IconEdit = svg('M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z');
export const IconSource = svg('M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520Z');
export const IconInfo = svg('M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z');
export const IconChevron = svg('M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z');
