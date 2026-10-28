import os
import paramiko
from scp import SCPClient

def deploy():
    host = "192.168.1.6"
    port = 22
    user = "oakprm"
    password = "okas0163"
    remote_dir = "/home/oakprm/SmartFarm"

    print(f"Connecting to SSH {user}@{host}:{port}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(host, port, user, password, timeout=10)
    except Exception as e:
        print(f"Failed to connect: {e}")
        return

    print("Creating remote directories...")
    dirs = [
        remote_dir,
        f"{remote_dir}/mosquitto",
        f"{remote_dir}/mosquitto/config",
        f"{remote_dir}/mosquitto/data",
        f"{remote_dir}/mosquitto/log",
        f"{remote_dir}/farm-web-app",
        f"{remote_dir}/farm-web-app/templates"
    ]
    for d in dirs:
        ssh.exec_command(f"mkdir -p {d}")

    print("Uploading files via SCP...")
    with SCPClient(ssh.get_transport()) as scp:
        # Local base dir
        local_base = os.path.dirname(os.path.abspath(__file__))
        
        # Files to upload (local relative path, remote absolute path)
        files = [
            ("docker-compose.yml", f"{remote_dir}/docker-compose.yml"),
            ("mosquitto/config/mosquitto.conf", f"{remote_dir}/mosquitto/config/mosquitto.conf"),
            ("farm-web-app/main.py", f"{remote_dir}/farm-web-app/main.py"),
            ("farm-web-app/Dockerfile", f"{remote_dir}/farm-web-app/Dockerfile"),
            ("farm-web-app/requirements.txt", f"{remote_dir}/farm-web-app/requirements.txt"),
            ("farm-web-app/templates/login.html", f"{remote_dir}/farm-web-app/templates/login.html"),
            ("farm-web-app/templates/dashboard.html", f"{remote_dir}/farm-web-app/templates/dashboard.html"),
        ]
        
        for local_file, remote_file in files:
            full_local_path = os.path.join(local_base, local_file.replace("/", os.sep))
            print(f"Uploading {local_file} -> {remote_file}")
            scp.put(full_local_path, remote_file)

    print("Executing docker compose up...")
    # Clean up existing container if any
    stdin, stdout, stderr = ssh.exec_command(f"cd {remote_dir} && docker compose down")
    stdout.read() # wait
    
    # Run compose up --build -d
    cmd = f"cd {remote_dir} && docker compose up --build -d"
    print(f"Running command on Pi: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    # Print output
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out:
        print(f"Output:\n{out}")
    if err:
        print(f"Errors:\n{err}")

    ssh.close()
    print("Deployment completed successfully!")

if __name__ == "__main__":
    deploy()
