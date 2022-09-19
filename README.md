# ContentBuster
 An automation tool for checking subdomains from a wordlist for HTML content

## Usage  
Required parameters:  
`node .\contentbuster.js -u <url> -w <wordlist>`  

Full parameters:  
`node .\contentbuster.js -u <url> -w <wordlist> -p <port> -t <timeout> -s <status codes> -e <exclude content> -i <include content>`  
`-u` URL to connect to  
`-w` Wordlist containing subdomains  
`-p` Port to connect to  
`-t` Request timeout in milliseconds  
`-s` Status codes to ignore in requests  
`-e` HTML content if found fails test  
`-i` HTML content if not found fails test  
`--v` Verbose. Outputs always, even on fail.  
`--help` Display help  

Example:  
`node .\contentbuster.js -u https://mydomain.com -w wordlist.txt -p 80 -t 1000 -s "400,404,500" -e "<div>test</div>" -i "<title>My Webpage</title> --v"`
