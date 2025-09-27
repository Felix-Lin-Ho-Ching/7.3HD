pipeline {
  agent any
  options {
    ansiColor('xterm')
    timestamps()
  }
  environment {
    IMAGE = 'sugardark/sit753-7-3hd-pipeline'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script {
          env.COMMIT = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
          echo "Commit: ${env.COMMIT}"
        }
      }
    }

    stage('Build & Push Image') {
      steps {
        script {
          sh "docker build -t ${IMAGE}:${env.COMMIT} ."
          sh "docker tag ${IMAGE}:${env.COMMIT} ${IMAGE}:latest"

          withDockerRegistry([credentialsId: 'docker-hub', url: 'https://index.docker.io/v1/']) {
            sh "docker push ${IMAGE}:${env.COMMIT}"
            sh "docker push ${IMAGE}:latest"
          }
        }
      }
    }

    stage('Test (Jest in container)') {
      steps {
        script {
          docker.image('node:20-alpine').inside('-u 1000:1000') {
            sh '''
              set -e
              npm ci
              mkdir -p reports/junit
              export NODE_ENV=test
              export NODE_OPTIONS=--experimental-vm-modules
              export JEST_JUNIT_OUTPUT_DIR=reports/junit
              export JEST_JUNIT_OUTPUT_NAME=junit.xml
              npx jest --ci --runInBand --forceExit --reporters=default --reporters=jest-junit
              ls -l reports/junit
            '''
          }
        }
      }
      post {
        always {
          junit testResults: 'reports/junit/**/*.xml', allowEmptyResults: false, keepLongStdio: true
        }
      }
    }

    stage('Code Quality (SonarQube)') {
      steps {
        withCredentials([
          string(credentialsId: 'sonar-host-url', variable: 'SONAR_HOST_URL'),
          string(credentialsId: 'sonar-token',    variable: 'SONAR_TOKEN')
        ]) {
          sh '''
            set -e
            echo "PWD: $PWD"
            ls -al

            # Ensure a sonar-project.properties exists (fallback if repo doesn't have one)
            if [ ! -f sonar-project.properties ]; then
              cat > sonar-project.properties <<'EOF'
sonar.projectKey=sit753-7-3hd
sonar.projectName=SIT753-7.3HD
sonar.sources=src
sonar.tests=tests,src/__tests__
sonar.test.inclusions=**/*.test.js,**/*.spec.js
sonar.exclusions=**/node_modules/**,**/reports/**
sonar.sourceEncoding=UTF-8
EOF
            fi

            docker run --rm --add-host=host.docker.internal:host-gateway \
              -e SONAR_HOST_URL="$SONAR_HOST_URL" \
              -e SONAR_LOGIN="$SONAR_TOKEN" \
              -v "$PWD:/usr/src" -w /usr/src \
              sonarsource/sonar-scanner-cli:latest \
              -Dsonar.projectBaseDir=/usr/src \
              -Dsonar.host.url="$SONAR_HOST_URL" \
              -Dsonar.login="$SONAR_TOKEN"
          '''
        }
      }
    }

    stage('Security (optional)') {
      when { expression { false } } // flip to true/add tools when ready
      steps { echo 'Add your SAST/Dependency scan here' }
    }

    stage('Deploy: Staging') {
      when { expression { false } } // implement if required
      steps { echo 'Deploying to staging...' }
    }

    stage('Release: Production') {
      when { expression { false } } // implement if required
      steps { echo 'Releasing to production...' }
    }

    stage('Monitoring Check') {
      when { expression { false } } // implement if required
      steps { echo 'Post-deploy monitoring checks...' }
    }
  }

  post {
    always { echo "Pipeline finished for ${env.COMMIT ?: 'unknown'}" }
  }
}
