export default function HelpContent() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-10">
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          What is an SVG file?
        </h2>
        <p className="text-gray-600 text-sm leading-relaxed mb-3">
          SVG (Scalable Vector Graphics) is an XML-based vector image format for 2D graphics.
          The main advantage is that you can change the image size without losing quality or
          detail. The format describes images as shapes, paths, text, and filter effects, so
          scaling keeps everything sharp at any resolution.
        </p>
        <p className="text-gray-600 text-sm leading-relaxed">
          SVG supports interactivity and animation. You can style SVG with CSS to change
          stroke width, color, outlines, hover effects, and more. Because SVG is XML, text
          editors can open and edit the files, and drawing tools like Inkscape or Adobe
          Illustrator are often used to create and refine them. Any part of an SVG can be
          animated, making it a flexible choice for icons and simple graphics on the web.
        </p>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          How can I use it?
        </h2>
        <p className="text-gray-600 text-sm leading-relaxed mb-3">
          Use SVGs for icons (e.g. icon fonts via IcoMoon), edit them in browser-based
          tools like SVG Edit, or work in desktop apps like Inkscape or Adobe Illustrator.
          For the best result when converting a raster image to SVG, use a source image with
          a clear, solid background and good contrast.
        </p>
        <p className="text-gray-600 text-sm leading-relaxed mb-3">
          SVGs work great for laser cutting or crafting with a Silhouette or Cricut—import
          your file into the machine&apos;s software and cut from the vector paths. You can also
          drop SVGs straight into your web pages. For example, in HTML:
        </p>
        <pre className="bg-gray-100 rounded-lg px-4 py-3 text-sm text-gray-800 font-mono overflow-x-auto">
          {`<img src="image.svg" alt="Image" />`}
        </pre>
        <p className="text-gray-600 text-sm leading-relaxed mt-3">
          SVG is widely supported, and many JavaScript libraries exist for manipulating
          and animating SVG in the browser.
        </p>
      </section>
    </div>
  );
}
