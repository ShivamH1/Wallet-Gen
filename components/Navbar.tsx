/**
 * A navigation bar component that appears at the top of the page.
 *
 * It contains a box icon, the app name "Kosh", and a version number,
 * as well as a theme toggle button to switch between light and dark mode.
 *
 * The component uses the "lucide-react" library to import the Box icon,
 * and the "ModeToggle" component from the "ui/theme-button" module.
 *
 * The styles for this component are defined in the global CSS file.
 */
import { Box } from "lucide-react"; // Import the Box icon from lucide-react
import React from "react"; // Import React
import { ModeToggle } from "./ui/theme-button"; // Import the theme toggle button from ui/theme-button
import { Separator } from "./ui/separator"; // Import the separator component from ui/separator

/**
 * The Navbar component renders a <nav> element with two main parts: a
 * left section containing the app name and version number, and a right
 * section containing the theme toggle button.
 */
const Navbar = () => {
  return (
    <nav className="flex justify-between items-center py-4">
      {/* The left section of the navbar contains the app name and version number. */
      /* It is a flex container with two items: the box icon and the app name */
      /* plus version number. */}
      <div className="flex items-center gap-2">
        <Box className="size-8" />{" "}
        {/* The box icon is rendered with a size of 8 */}
        <div className="flex flex-col gap-4">
          {/* The app name and version number are rendered in a flex container */
          /* with a gap of 4px between them. */}
          <span className="tracking-tighter text-3xl font-extrabold text-primary flex gap-2 items-center">
            Wallet Gen{" "}
            {/* The version number is rendered in a rounded rectangle with a */
            /* background color of primary/10 and a border color of primary/50. */}
            <span className="rounded-full text-base bg-primary/10 border border-primary/50 px-2">
              v1.3
            </span>
          </span>
        </div>
      </div>
      {/* The right section of the navbar contains the theme toggle button. */}
      <ModeToggle />
    </nav>
  );
};

export default Navbar;
