import * as React from "react";

import * as LucideIcons from "lucide-react";

// LucidIcon Renderer
const IconRenderer = React.forwardRef(({ icon, size, className, ...props }, ref) => {
  const IconComponent = LucideIcons[icon];
  return (
    <IconComponent ref={ref} size={size} {...props}  className={className}/>
  );
});
IconRenderer.displayName = "IconRenderer";

export { IconRenderer };
