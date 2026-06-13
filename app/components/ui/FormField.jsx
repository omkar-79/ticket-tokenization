import Input from "./Input.jsx";

export function FormField({ label, hint, htmlFor, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs uppercase tracking-widest text-muted">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted leading-relaxed">{hint}</p>}
    </div>
  );
}

export function LabeledInput({ id, label, hint, ...props }) {
  return (
    <FormField label={label} hint={hint} htmlFor={id}>
      <Input id={id} {...props} />
    </FormField>
  );
}
