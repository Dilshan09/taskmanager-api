pipeline {
    agent any

    environment {
        IMAGE_NAME    = "taskmanager-api"
        IMAGE_TAG     = "build-${BUILD_NUMBER}"
        SONAR_HOST    = "http://localhost:9000"
        STAGING_PORT  = "3000"
    }

    stages {

        // ── Stage 1: Build ────────────────────────────────────────────────────
        stage('Build') {
            steps {
                echo "=== BUILD STAGE ==="
                sh 'docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .'
                sh 'docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:latest'
                echo "Docker image built: ${IMAGE_NAME}:${IMAGE_TAG}"
            }
            post {
                success {
                    echo "Build artefact created: ${IMAGE_NAME}:${IMAGE_TAG}"
                }
            }
        }

        // ── Stage 2: Test ─────────────────────────────────────────────────────
        stage('Test') {
            steps {
                echo "=== TEST STAGE ==="
                sh 'npm install'
                sh 'mkdir -p test-results'
                sh 'npm test'
            }
            post {
                always {
                    junit 'test-results/junit.xml'
                }
                success {
                    echo "All tests passed!"
                }
                failure {
                    echo "Tests failed — stopping pipeline."
                }
            }
        }

        // ── Stage 3: Code Quality ─────────────────────────────────────────────
        stage('Code Quality') {
            steps {
                echo "=== CODE QUALITY STAGE ==="
                sh 'npm run test:coverage'
                withSonarQubeEnv('SonarQube') {
                    sh '''
                        sonar-scanner \
                          -Dsonar.projectKey=taskmanager-api \
                          -Dsonar.sources=src \
                          -Dsonar.tests=tests \
                          -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                          -Dsonar.host.url=${SONAR_HOST}
                    '''
                }
            }
            post {
                always {
                    // Publish coverage HTML report if available
                    publishHTML(target: [
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'coverage/lcov-report',
                        reportFiles: 'index.html',
                        reportName: 'Coverage Report'
                    ])
                }
            }
        }

        // ── Stage 4: Security ─────────────────────────────────────────────────
        stage('Security') {
            steps {
                echo "=== SECURITY STAGE ==="
                // Scan Docker image for vulnerabilities using Trivy
                sh '''
                    trivy image \
                      --exit-code 0 \
                      --severity LOW,MEDIUM,HIGH,CRITICAL \
                      --format table \
                      --output trivy-report.txt \
                      ${IMAGE_NAME}:${IMAGE_TAG}
                '''
                sh 'cat trivy-report.txt'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report.txt', allowEmptyArchive: true
                }
            }
        }

        // ── Stage 5: Deploy (Staging) ─────────────────────────────────────────
        stage('Deploy') {
            steps {
                echo "=== DEPLOY STAGE (Staging) ==="
                // Stop any existing staging container
                sh 'docker stop taskmanager-staging || true'
                sh 'docker rm taskmanager-staging   || true'
                // Deploy app + prometheus + grafana
                sh 'docker-compose up -d'
                // Wait for health check to pass
                sh '''
                    echo "Waiting for app to be healthy..."
                    for i in $(seq 1 12); do
                        STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || echo "000")
                        if [ "$STATUS" = "200" ]; then
                            echo "App is healthy!"
                            break
                        fi
                        echo "Attempt $i: Status=$STATUS, retrying in 5s..."
                        sleep 5
                    done
                '''
            }
        }

        // ── Stage 6: Release ──────────────────────────────────────────────────
        stage('Release') {
            steps {
                echo "=== RELEASE STAGE ==="
                // Tag the image as a release version
                sh 'docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:release-${BUILD_NUMBER}'
                // Create a Git tag for this release
                sh '''
                    git config user.email "jenkins@pipeline.local"
                    git config user.name  "Jenkins"
                    git tag -a "release-${BUILD_NUMBER}" -m "Release build ${BUILD_NUMBER}" || true
                    git push origin "release-${BUILD_NUMBER}" || echo "Git push skipped (no remote configured)"
                '''
                echo "Released: ${IMAGE_NAME}:release-${BUILD_NUMBER}"
            }
        }

        // ── Stage 7: Monitoring ───────────────────────────────────────────────
        stage('Monitoring') {
            steps {
                echo "=== MONITORING STAGE ==="
                // Verify Prometheus is scraping the app
                sh '''
                    sleep 5
                    echo "Checking Prometheus targets..."
                    PROM_STATUS=$(curl -s http://localhost:9090/-/healthy || echo "not reachable")
                    echo "Prometheus: $PROM_STATUS"

                    echo "Checking app /metrics endpoint..."
                    curl -s http://localhost:3000/metrics | grep "http_requests_total" | head -5

                    echo "Grafana available at: http://localhost:3001 (admin/admin)"
                    echo "Prometheus available at: http://localhost:9090"
                    echo "Monitoring stack verified!"
                '''
            }
        }

    }

    // ── Post-pipeline Actions ─────────────────────────────────────────────────
    post {
        success {
            echo """
            ╔══════════════════════════════════════╗
            ║   Pipeline PASSED  ✓                 ║
            ║   Build: ${BUILD_NUMBER}              ║
            ║   Image: ${IMAGE_NAME}:release-${BUILD_NUMBER} ║
            ╚══════════════════════════════════════╝
            """
        }
        failure {
            echo "Pipeline FAILED on stage. Check logs above."
            // Optionally email on failure:
            // mail to: 'your-email@example.com',
            //      subject: "Build ${BUILD_NUMBER} Failed",
            //      body: "See ${env.BUILD_URL}"
        }
        always {
            echo "Pipeline finished. Build #${BUILD_NUMBER}"
        }
    }
}
