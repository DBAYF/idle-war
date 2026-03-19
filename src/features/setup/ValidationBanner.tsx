import type { ValidationResult } from '../../domain/validateSetup';

interface ValidationBannerProps {
  validation: ValidationResult;
  visible?: boolean;
}

export function ValidationBanner({ validation, visible = true }: ValidationBannerProps) {
  if (!visible) return null;
  if (validation.valid && (!validation.warnings || validation.warnings.length === 0)) {
    return null;
  }

  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings && validation.warnings.length > 0;

  return (
    <div
      className={`validation-banner ${hasErrors ? 'validation-banner-error' : 'validation-banner-warning'}`}
      role={hasErrors ? 'alert' : undefined}
      aria-live={hasErrors ? 'assertive' : 'polite'}
      aria-label={hasErrors ? 'Validation errors' : hasWarnings ? 'Validation warnings' : undefined}
    >
      {validation.errors.map((msg, i) => (
        <p key={`err-${i}`}>{msg}</p>
      ))}
      {hasWarnings &&
        validation.warnings!.map((msg, i) => (
          <p key={`warn-${i}`}>{msg}</p>
        ))}
    </div>
  );
}
