interface WizardStepsProps {
  steps: string[]
  currentStep: number
  className?: string
}

export function WizardSteps({ steps, currentStep, className = '' }: WizardStepsProps) {
  return (
    <nav className={`wizard-steps ${className}`.trim()} aria-label="Send workflow progress">
      <ol className="wizard-steps-list">
        {steps.map((label, index) => {
          const isCompleted = index < currentStep
          const isActive = index === currentStep
          const status = isCompleted ? 'completed' : isActive ? 'active' : 'upcoming'

          return (
            <li
              key={label}
              className={`wizard-step wizard-step--${status}`}
              aria-current={isActive ? 'step' : undefined}
            >
              <div className="wizard-step-track">
                <span className="wizard-step-number" aria-hidden>
                  {isCompleted ? '✓' : index + 1}
                </span>
                {index < steps.length - 1 && (
                  <span
                    className={`wizard-step-connector ${isCompleted ? 'wizard-step-connector--filled' : ''}`}
                    aria-hidden
                  />
                )}
              </div>
              <span className="wizard-step-label">{label}</span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
