chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.id) {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        func: () => {
          const script = document.createElement("script");
          script.src = chrome.runtime.getURL("scripts/web-component.js");
          document.head.appendChild(script);

          script.onload = () => {
            // Function to replace specific text in a node's text content
            const replaceTextInElement = (
              element: Element,
              replacements: { [key: string]: string }
            ) => {
              element.childNodes.forEach((node) => {
                if (node.nodeType === Node.TEXT_NODE) {
                  let textContent = node.textContent;
                  Object.keys(replacements).forEach((oldText) => {
                    const newText = replacements[oldText];
                    if (textContent?.includes(oldText)) {
                      textContent = textContent.replace(oldText, newText);
                    }
                  });
                  node.textContent = textContent;
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                  // Recursively replace text in child elements
                  replaceTextInElement(node as Element, replacements);
                }
              });
            };

            // Function to clone and modify an element
            const cloneAndModifyElement = (
              selector: string,
              replacements: { [key: string]: string }
            ) => {
              const element = document.querySelector(selector);
              if (element) {
                const clonedElement = element.cloneNode(true) as HTMLElement;

                // Replace text in the cloned element
                replaceTextInElement(clonedElement, replacements);

                // Insert the cloned element adjacent to the original
                element.insertAdjacentElement("afterend", clonedElement);
                console.log("Element cloned and modified with new text.");
              } else {
                console.error(`Element with selector ${selector} not found.`);
              }
            };

            // Replacements object
            const textReplacements = {
              Brokerage: "Giving",
              "Active Investing": "Donor-Advised Fund",
            };

            // Clone and modify the target element using partial class selector
            cloneAndModifyElement(
              "[class*='StyledAccountCard']",
              textReplacements
            );

            // Existing function to wait for the target <a> element with specific text
            const waitForElementWithText = (
              selector: string,
              text: string,
              callback: (element: Element) => void
            ) => {
              const interval = setInterval(() => {
                const elements = document.querySelectorAll(selector);
                let targetElement: Element | null = null;

                elements.forEach((element) => {
                  // Clean the element text by removing extra whitespace and invisible characters
                  const elementText = element.textContent
                    ?.trim()
                    .replace(/\s+/g, " ");
                  if (elementText === text) {
                    targetElement = element;
                  }
                });

                if (targetElement) {
                  clearInterval(interval); // Stop checking once the element is found
                  callback(targetElement); // Execute the callback with the found element
                }
              }, 100); // Check every 100ms
            };

            // Monitor for DOM changes in case React re-renders and removes the injected element
            const observeDOMChanges = (targetNode: Node) => {
              const observer = new MutationObserver(
                (mutationsList, observer) => {
                  for (let mutation of mutationsList) {
                    if (mutation.type === "childList") {
                      // Re-inject the web component only if it doesn't already exist
                      const webComponentExists =
                        document.querySelector("web-my-component");
                      if (!webComponentExists) {
                        const webComponent =
                          document.createElement("web-my-component");
                        // @ts-ignore
                        targetNode.insertAdjacentElement(
                          "beforebegin",
                          webComponent
                        );
                        console.log(
                          "Web component re-injected after DOM changes"
                        );
                      }
                      // Re-check and replace <h1> text if it changes due to DOM updates
                      replaceH1Text("Brokerage", "Giving");
                    }
                  }
                }
              );

              observer.observe(document.body, {
                childList: true,
                subtree: true,
              });
            };

            // Function to find and replace specific text in h1 elements
            const replaceH1Text = (oldText: string, newText: string) => {
              const h1Elements = document.querySelectorAll("h1");
              h1Elements.forEach((element) => {
                // Replace only the specific text node within the h1, without affecting other children
                replaceTextInElement(element, { [oldText]: newText });
              });
            };

            // Replace <h1> text initially
            replaceH1Text("Brokerage", "Giving");

            // Wait for the <a> element with specific text "Transfer investments" and then inject the web component
            waitForElementWithText(
              "a",
              "Transfer investments",
              (targetElement) => {
                // Check if the web component already exists before injecting
                if (!document.querySelector("web-my-component")) {
                  const webComponent =
                    document.createElement("web-my-component");
                  targetElement.insertAdjacentElement(
                    "beforebegin",
                    webComponent
                  );
                  console.log(
                    "Web component injected before the specified <a> element"
                  );
                }

                // Start observing DOM changes to re-inject if needed
                observeDOMChanges(targetElement);
              }
            );
          };
        },
      },
      (results) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Script injection failed:",
            chrome.runtime.lastError.message
          );
        } else {
          console.log("Script injected successfully:", results);
        }
      }
    );
  }
});
