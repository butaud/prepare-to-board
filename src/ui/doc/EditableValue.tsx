import { createElement, FC, FocusEvent, FormEvent, useState } from "react";

export type EditableValueProps<T extends string | number> = {
  value: T;
  onValueChange: (newValue: T) => void;
  as: "label" | "h1" | "h2" | "h3" | "h4" | "span" | "p";
  canEdit: boolean;
  autoFocus?: boolean;
  className?: string;
  onClick?: () => void;
  onCancel?: () => void;
  editingByDefault?: boolean;
  label?: string;
};

type EditableValueInnerProps<T extends string | number> =
  EditableValueProps<T> & {
    serialize: (value: T) => string;
    deserialize: (value: string) => T;
    inputType: "text" | "number";
  };
const EditableValueInner = <T extends string | number>({
  value,
  onValueChange,
  as,
  className,
  canEdit,
  autoFocus,
  inputType,
  onCancel,
  editingByDefault,
  label,
  serialize,
  deserialize,
}: EditableValueInnerProps<T>) => {
  const [isEditing, setIsEditing] = useState(editingByDefault ?? false);
  const [draftValue, setDraftValue] = useState(value);

  const onStartEditing = () => {
    setDraftValue(value);
    setIsEditing(true);
  };
  const onCancelInternal = () => {
    setIsEditing(false);
    onCancel?.();
  };
  const onSubmit = (
    e: FormEvent<HTMLFormElement> | FocusEvent<HTMLInputElement>
  ) => {
    e.preventDefault();
    if (draftValue !== "") {
      onValueChange(draftValue);
      setIsEditing(false);
    } else {
      onCancelInternal();
    }
  };

  if (isEditing) {
    return (
      <form onSubmit={onSubmit} className={className}>
        <input
          autoFocus={autoFocus}
          type={inputType}
          value={serialize(draftValue)}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setDraftValue(deserialize(e.currentTarget.value))}
          onBlur={onSubmit}
          onKeyDown={(e) => e.key === "Escape" && onCancelInternal()}
          className={className}
          aria-label={label}
          title={label}
        />
      </form>
    );
  } else {
    const interactivityProps = canEdit
      ? {
          onDoubleClick: onStartEditing,
        }
      : {};
    return createElement(
      as,
      {
        className,
        title: serialize(value),
        ...interactivityProps,
      },
      serialize(value)
    );
  }
};

export const EditableString: FC<EditableValueProps<string>> = (props) => {
  return (
    <EditableValueInner<string>
      {...props}
      inputType="text"
      serialize={(value) => value}
      deserialize={(value) => value}
    />
  );
};

export const EditableInteger: FC<EditableValueProps<number>> = (props) => {
  return (
    <EditableValueInner<number>
      {...props}
      inputType="number"
      serialize={(value) => value.toString()}
      deserialize={(value) => parseInt(value, 10)}
    />
  );
};
