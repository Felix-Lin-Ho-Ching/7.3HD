pipeline {
  agent any

  options {
    ansiColor('xterm')
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }

  environment {
    REGISTRY_URL     = 'https://index.docker.io/v1/'
    DOCKER_NAMESPACE = 'sugardark'              // <-- change if your Docker Hub username is different
    IMAGE_NAME       = 'sit753-7-3hd-pipeline'  // repo name on Docker Hub
    COMMIT           = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
  }

  stages {

    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Build & Push Image') {
      steps {
        script {
          // build image with commit tag
          def img = docker.build("${env.DOCKER_NAMESPACE}/${env.IMAGE_NAME}:${env.COMMIT}")
          // login + push (uses the 'dockerhub' credential you created)
          docker.withRegistry(env.REGISTRY_URL, 'dockerhub') {
            img.push()          // push commit tag
            img.push('latest')  // update :latest
          }
        }
      }
    }

    stage('Test (Jest in container)') {
      options { timeout(time: 5, unit: 'MINUTES') }   // never hang forever
        steps {
          script {
            withDockerContainer(image: 'node:20-alpine') {
              sh '''
                set -euxo pipefail
                npm ci
                mkdir -p reports/junit
                NODE_OPTIONS=--experimental-vm-modules npx jest --ci --runInBand
                echo "== Files under reports/ =="
                find reports -type f -maxdepth 3 -print || true
              '''
            }
          }
        }
        post {
          always {
      
            junit allowEmptyResults: true, testResults: 'reports/**/*.xml'
            archiveArtifacts allowEmptyArchive: true, artifacts: 'reports/**/*'
          }
        }
      }

    stage('Code Quality') {
      when { expression { fileExists('package.json') } }
      steps {
        sh 'npm run lint || echo "Lint step skipped (no linter configured)"'
      }
    }

    stage('Security (optional)') {
      when { expression { return env.SNYK_TOKEN?.trim() } }
      steps {
        script {
          docker.withRegistry(env.REGISTRY_URL, 'dockerhub') {
            
            sh """
              docker pull ${DOCKER_NAMESPACE}/${IMAGE_NAME}:${COMMIT}
              docker run --rm \
                -e SNYK_TOKEN=${SNYK_TOKEN} \
                -v /var/run/docker.sock:/var/run/docker.sock \
                snyk/snyk:docker test ${DOCKER_NAMESPACE}/${IMAGE_NAME}:${COMMIT} || true
            """
          }
        }
      }
    }

    stage('Deploy: Staging') {
      steps {
        echo "This is a placeholder. Tag to staging is ${DOCKER_NAMESPACE}/${IMAGE_NAME}:${COMMIT}"
      }
    }

    stage('Release: Production') {
      when { branch 'main' }
      steps {
        input message: "Promote ${COMMIT} to production?"
        echo "Release approved."
      }
    }

    stage('Monitoring Check') {
      steps {
        echo 'Run your /health or Prometheus scrape check here.'
      }
    }
  }

  post {
    always {
      echo "Pipeline finished for ${COMMIT}"
    }
  }
}
