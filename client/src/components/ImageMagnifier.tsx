import { useState, useRef, type MouseEvent } from "react";

interface ImageMagnifierProps {
    src: string;
    width?: string | number;
    height?: string | number;
    zoomLevel?: number;
}

const ImageMagnifier = ({
    src,
    width = "100%",
    height = "auto",
    zoomLevel = 2.0,
}: ImageMagnifierProps) => {
    const [showMagnifier, setShowMagnifier] = useState(false);
    const [[x, y], setXY] = useState([0, 0]);
    const [[imgWidth, imgHeight], setSize] = useState([0, 0]);
    const imgRef = useRef<HTMLImageElement>(null);

    const handleMouseEnter = (e: MouseEvent) => {
        const elem = e.currentTarget;
        const { width, height } = elem.getBoundingClientRect();
        setSize([width, height]);
        setShowMagnifier(true);
    };

    const handleMouseMove = (e: MouseEvent) => {
        const elem = e.currentTarget;
        const { top, left } = elem.getBoundingClientRect();

        // Calculate cursor position relative to the image
        const x = e.pageX - left - window.pageXOffset;
        const y = e.pageY - top - window.pageYOffset;
        setXY([x, y]);
    };

    const handleMouseLeave = () => {
        setShowMagnifier(false);
    };

    return (
        <div
            style={{
                position: "relative",
                height: height,
                width: width,
                cursor: "crosshair", // Indicates zoom capability
            }}
            className="group"
        >
            <img
                ref={imgRef}
                src={src}
                style={{ height: "100%", width: "100%", objectFit: "cover" }}
                onMouseEnter={handleMouseEnter}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                alt="Product"
                className="rounded-lg"
            />

            {/* Magnifier Lens / Overlay */}
            {showMagnifier && (
                <div
                    style={{
                        display: "block",
                        position: "absolute",
                        pointerEvents: "none",
                        // Center the zoom window over the cursor or to the side?
                        // "Lens" style usually means a square following the cursor.
                        // Flipkart style often is a side panel, but for a general component, a lens or side-by-side is best.
                        // Let's go with a "Side Zoom" if screen is large, but simpler "Lens" might be easier to implement generically.
                        // Actually, let's implement a "Box" that appears to the right.

                        // For this implementation, I'll do an Absolute positioned box *inside* the container but potentially overflowing?
                        // No, Flipkart shows it in a separate pane to the right. 
                        // However, to keep it self-contained without massive layout changes in parent, 
                        // I'll make a larger "Zoom Window" that appears on top/right.

                        height: "400px",
                        width: "400px",
                        left: "105%", // Show to the right
                        top: "0",
                        zIndex: 50,
                        border: "1px solid lightgray",
                        backgroundColor: "white",
                        backgroundImage: `url('${src}')`,
                        backgroundRepeat: "no-repeat",

                        // Calculate background position
                        backgroundSize: `${imgWidth * zoomLevel}px ${imgHeight * zoomLevel}px`,
                        backgroundPositionX: `${-x * zoomLevel + 200}px`, // +200 to center it roughly? No.
                        // Standard Formula: -x * zoomLevel + magnifierWidth / 2
                        // But usually we want exact pixel mapping.
                        backgroundPosition: `-${x * zoomLevel - 200}px -${y * zoomLevel - 200}px`
                        // Adjusted: we want the center of the magnifier to show the content at (x,y)
                        // Content at x,y is at x*zoom, y*zoom in the large image.
                        // We want that point to be at center of 400x400 box (200, 200).
                        // So bgPos = 200 - x*zoom
                    }}
                    className="hidden lg:block shadow-2xl rounded-lg bg-white"
                ></div>
            )}
        </div>
    );
};

export default ImageMagnifier;
