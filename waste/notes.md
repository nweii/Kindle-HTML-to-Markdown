Some popular open-source libraries and frameworks that might be useful for building a web application that accepts file uploads, performs the script on the file, and provides a UI for downloading the result include:  
	-	**React-Dropzone**: A React library for handling file uploads.  
	-	**Multer**: A middleware for handling file uploads in Node.js.  
	-	**Dropzone.js**: A popular open-source library for handling file uploads in JavaScript.  

You can also look into using pre-built web components such as  
	-	**React-filepond**: A React wrapper for the popular FilePond library, which provides a file upload interface with a variety of options for customizing the UI and handling file uploads.

For desktop application you can look into:  
	-	**Electron**: A popular open-source framework for building cross-platform desktop applications using JavaScript, HTML, and CSS.
It's important to note that these libraries and frameworks can be used as a starting point, but you may need to customize them or add additional functionality in order to meet the specific requirements of your application.


There are several open-source GitHub repositories that provide pre-built front-end interfaces that you can use to run your JavaScript function on a given file. Here are a few examples:  

- **File-Drop**: A JavaScript library that provides a simple drag-and-drop interface for handling file uploads. It can be easily integrated with your application and used to run your JavaScript function on a given file.  
- **FileReader**: A JavaScript library that makes it easy to read files and process their contents. It provides a simple API for handling file uploads and processing the file contents, you could use it as a starting point for running your JavaScript function on a given file.  
- **dropzone**: A open-source library that provides a drag-and-drop file uploads with image previews. It can be easily integrated with your application and used to run your JavaScript function on a given file.   
All of these libraries are open-source and available on GitHub, you can fork their repository and customize it to suit your specific needs.  

Please note that these libraries are mainly focused on the handling of the file upload and reading process, you'll need to integrate your custom function and handle the file download by yourself.

# Using File-Drop
To run the JavaScript function you provided on an uploaded HTML file using the File-Drop library, you can do the following:

Include the File-Drop library in your project, you can do this by installing it via npm npm install filedrop-js or by including the library's script file directly in your HTML.

In your JavaScript file, initialize the FileDrop instance and specify the DOM element that will be used as the file drop zone.

Copy code
const filedrop = new FileDrop('body');
Add an event listener for the filedrop event, this event is triggered when a file is dropped in the drop zone.
Copy code
filedrop.event('filedrop', (file) => {
		// your code here
});
Inside the event listener, you can use the FileReader API to read the contents of the uploaded file and parse it as an HTML document.
Copy code
const reader = new FileReader();
reader.onload = (event) => {
		const fileContent = event.target.result;
		const parser = new DOMParser();
		const doc = parser.parseFromString(fileContent, "text/html");
		// your code here
};
reader.readAsText(file);
Once you have the HTML document, you can use querySelector and getElementsByTagName to select the elements you need and call your JavaScript function with the selected elements as inputs.
Copy code
const container = doc.querySelector('.bodyContainer').getElementsByTagName('div');
// call your function
const markdown = kindleToMarkdown(container);
Finally, you can use FileSaver.js or js-file-download to save the output as a file for download.
Copy code
const blob = new Blob([markdown], {type: "text/plain;charset=utf-8"});
saveAs(blob, "output.md");
Keep in mind that the code you provided assumes that the HTML file has a specific structure, you might have to adjust the selectors accordingly based on the structure of the file you want to process.