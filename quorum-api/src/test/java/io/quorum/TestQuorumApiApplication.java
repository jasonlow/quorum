package io.quorum;

import org.springframework.boot.SpringApplication;

public class TestQuorumApiApplication {

	public static void main(String[] args) {
		SpringApplication.from(QuorumApiApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
