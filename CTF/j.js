
        // Function to get a specific cookie by name
        function getCookie(name) {
            let value = "; " + document.cookie;
            let parts = value.split("; " + name + "=");
            if (parts.length === 2) return parts.pop().split(";").shift();
        }

        // The logic
        const userRole = getCookie("user_role");

        if (userRole === "admin") {
            document.getElementById('display-area').innerHTML = `
                <p class="granted">ACCESS GRANTED</p>
                <p>Welcome back, Administrator.</p>
                <p>Your Flag: <strong>CAU{c00k1e_m0nst3r_4dm1n}</strong></p>
            `;
        } else {
            // Set a 'guest' cookie if none exists to give the player a hint
            if (!userRole) {
                document.cookie = "user_role=guest; path=/";
            }
            document.getElementById('display-area').innerHTML = `
                <p class="denied">ACCESS DENIED</p>
                <p>Current Role: <i>guest</i></p>
                <p>Error: Only users with the <b>admin</b> role can view the secret key.</p>
            `;
        }
