import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const statusCodeResponseTypes = {
    400: "400 Bad Request",
    401: "401 Unauthorized",
    405: "405 Method Not Allowed",
    500: "500 Internal Server Error",
    502: "502 Bad Gateway",
    503: "503 Service Unavailable",
    408: "408 Request Timeout",
    200: "200 OK",
}

export const POST = async ({ request }) => {
    try {
        const requestJSON = await request.json();
        const { username, password } = requestJSON;

        if (!username || !password) {
            return new Response(JSON.stringify({
                error: "Username and password are required"
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        if (username !== process.env.AUTH_USERNAME || password !== process.env.AUTH_PASSWORD) {
            return new Response(JSON.stringify({
                error: "Invalid credentials"
            }), {
                status: 401,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        const { stdout, stderr } = await execAsync('kubectl rollout restart deployment/server-chunk');
        const { stdout, stderr } = await execAsync('kubectl rollout restart deployment/server');
        
        if (stderr) {
            console.error('kubectl stderr:', stderr);
            return new Response(JSON.stringify({
                error: "Failed to restart pods",
                details: stderr
            }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            message: "Pod restart initiated successfully",
            output: stdout
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        console.error('Error restarting pods:', error);
        return new Response(JSON.stringify({
            error: "500 Internal Server Error",
            message: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}
