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
  // "single" starts editing on a single click when the field is currently
  // empty (lower friction for filling in a never-set value), while still
  // requiring the usual double-click once a value exists. Defaults to
  // "double" everywhere.
  emptyClickBehavior?: "single" | "double";
  // Shown (muted/italic) in place of the value when it's empty and
  // editable, so there's actually something visible and clickable - an
  // empty string alone renders as a genuinely zero-size element with
  // nothing to click on.
  placeholder?: string;
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
  emptyClickBehavior = "double",
  placeholder,
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
    const isEmpty = value === "";
    const useSingleClick = emptyClickBehavior === "single" && isEmpty;
    const interactivityProps = canEdit
      ? useSingleClick
        ? { onClick: onStartEditing }
        : { onDoubleClick: onStartEditing }
      : {};
    const showPlaceholder = canEdit && isEmpty && placeholder !== undefined;
    return createElement(
      as,
      {
        className: [
          className,
          canEdit && "editable-affordance",
          showPlaceholder && "editable-placeholder",
        ]
          .filter(Boolean)
          .join(" "),
        title: serialize(value),
        ...interactivityProps,
      },
      showPlaceholder ? placeholder : serialize(value)
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
