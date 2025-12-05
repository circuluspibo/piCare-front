import * as React from "react";

import * as LucideIcons from "lucide-react";

// LucidIcon Renderer
const IconRenderer = React.forwardRef(({ icon, ...props }, ref) => {
  const IconComponent = LucideIcons[icon];
  return (
    <IconComponent ref={ref} style={{ width: 72, height: 72 }} {...props} />
  );
});
IconRenderer.displayName = "IconRenderer";

export { IconRenderer };
